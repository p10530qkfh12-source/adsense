import Anthropic from '@anthropic-ai/sdk';
import { AGENT_PROMPTS } from './prompts';
import { generateImage } from '../image-generator';
import type {
  StrategyOutput,
  WriterOutput,
  IllustratorOutput,
  ImagePlacement,
} from '../types';

// Anthropic 클라이언트
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

// 삽화가 분석 결과 타입
interface IllustratorAnalysis {
  style: string;
  placements: ImagePlacement[];
}

// JSON 파싱 헬퍼
function parseJSON<T>(text: string): T {
  // JSON 블록 추출 시도
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // 중괄호로 시작하는 JSON 찾기
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  }

  throw new Error('JSON 파싱 실패: 유효한 JSON을 찾을 수 없습니다.');
}

// 마크다운에 이미지 삽입
function insertImageIntoContent(
  content: string,
  afterHeading: string,
  imageUrl: string,
  altText: string
): string {
  // 해당 heading 찾기 (## 로 시작하는 줄)
  const headingPattern = new RegExp(
    `(## ${afterHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\n]*\n)`,
    'i'
  );

  const match = content.match(headingPattern);

  if (match) {
    // heading 바로 다음에 이미지 삽입
    const imageMarkdown = `\n![${altText}](${imageUrl})\n`;
    return content.replace(match[0], match[0] + imageMarkdown);
  }

  // heading을 찾지 못한 경우, 부분 매칭 시도
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## ') &&
        lines[i].toLowerCase().includes(afterHeading.toLowerCase().substring(0, 10))) {
      const imageMarkdown = `\n![${altText}](${imageUrl})\n`;
      lines.splice(i + 1, 0, imageMarkdown);
      return lines.join('\n');
    }
  }

  console.warn(`헤딩을 찾을 수 없음: ${afterHeading}`);
  return content;
}

/**
 * 삽화가 에이전트 실행
 * 1. Claude로 이미지 배치 위치 분석
 * 2. DALL-E 3로 이미지 생성
 * 3. 마크다운에 이미지 삽입
 */
export async function runIllustrator(
  draft: WriterOutput,
  strategy: StrategyOutput,
  onImageProgress?: (current: number, total: number) => void
): Promise<IllustratorOutput> {
  // 1. Claude로 이미지 배치 분석
  const analysisPrompt = `
## 블로그 주제
${strategy.searchIntent}

## 타겟 독자
${strategy.targetAudience}

## 블로그 본문
${draft.content}

---

위 블로그 글을 분석하여 이미지가 들어가기 좋은 위치 2~4곳을 선정하고, 각 위치에 맞는 DALL-E 3 프롬프트를 작성해주세요.
JSON 형식으로 출력해주세요.
`;

  console.log('삽화가: 이미지 배치 분석 시작...');

  const analysisResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: AGENT_PROMPTS.illustrator,
    messages: [{ role: 'user', content: analysisPrompt }]
  });

  const analysisContent = analysisResponse.content[0];
  if (analysisContent.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  const analysis = parseJSON<IllustratorAnalysis>(analysisContent.text);
  console.log(`삽화가: ${analysis.placements.length}개 이미지 위치 선정 완료`);

  // 2. 이미지 생성
  const imageUrls: string[] = [];
  const successfulPlacements: ImagePlacement[] = [];
  let modifiedContent = draft.content;

  for (let i = 0; i < analysis.placements.length; i++) {
    const placement = analysis.placements[i];

    // 진행률 알림
    if (onImageProgress) {
      onImageProgress(i + 1, analysis.placements.length);
    }

    console.log(`삽화가: 이미지 ${i + 1}/${analysis.placements.length} 생성 중...`);

    // DALL-E 3로 이미지 생성
    const result = await generateImage(placement.dallePrompt);

    if (result.success && result.imageUrl) {
      imageUrls.push(result.imageUrl);
      successfulPlacements.push(placement);

      // 마크다운에 이미지 삽입
      modifiedContent = insertImageIntoContent(
        modifiedContent,
        placement.afterHeading,
        result.imageUrl,
        placement.altText
      );

      console.log(`삽화가: 이미지 ${i + 1} 생성 및 삽입 완료`);
    } else {
      console.warn(`삽화가: 이미지 ${i + 1} 생성 실패 - ${result.error}`);
      // 실패해도 계속 진행 (graceful degradation)
    }

    // Rate limit 방지를 위한 딜레이
    if (i < analysis.placements.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`삽화가: 총 ${imageUrls.length}/${analysis.placements.length}개 이미지 생성 완료`);

  return {
    content: modifiedContent,
    placements: successfulPlacements,
    imagesGenerated: imageUrls.length,
    imageUrls,
  };
}
