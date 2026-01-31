import Anthropic from '@anthropic-ai/sdk';
import { AGENT_PROMPTS } from './prompts';
import { runIllustrator } from './illustrator';
import type {
  AgentType,
  StrategyOutput,
  WriterOutput,
  EditorOutput,
  ReviewerOutput,
  IllustratorOutput
} from '../types';

// Anthropic 클라이언트 초기화
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

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

// 에이전트 A: 전략가 실행
export async function runStrategist(topic: string, keywords?: string[]): Promise<StrategyOutput> {
  const userMessage = `
주제: ${topic}
${keywords?.length ? `추가 키워드: ${keywords.join(', ')}` : ''}

위 주제에 대해 SEO에 최적화된 블로그 포스트 구조를 설계해주세요.
`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: AGENT_PROMPTS.strategist,
    messages: [{ role: 'user', content: userMessage }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  return parseJSON<StrategyOutput>(content.text);
}

// 최소 글자 수 상수
const MIN_CONTENT_LENGTH = 1500;

// 에이전트 B: 작가 실행
export async function runWriter(strategy: StrategyOutput): Promise<WriterOutput> {
  const buildPrompt = (isRetry: boolean, currentLength?: number) => `
## 콘텐츠 전략
- 검색 의도: ${strategy.searchIntent}
- 타겟 독자: ${strategy.targetAudience}
- 핵심 키워드: ${strategy.keywords.join(', ')}

## 구조
### 서론
${strategy.outline.introduction.map(p => `- ${p}`).join('\n')}

### 본론
${strategy.outline.body.map(section => `
#### ${section.heading}
${section.points.map(p => `- ${p}`).join('\n')}
`).join('\n')}

### 결론
${strategy.outline.conclusion.map(p => `- ${p}`).join('\n')}

위 구조를 바탕으로 인간적이고 자연스러운 블로그 포스트를 작성해주세요.

## ⚠️ 필수 요구사항 (반드시 준수!)
${isRetry ? `
**[경고] 이전 작성 분량이 ${currentLength}자로 최소 기준(1500자)에 미달했습니다.**
**이번에는 반드시 1500자 이상으로 작성해주세요!**
` : ''}
1. **⛔ 반드시 최소 1500자 이상, 권장 2000~3000자로 작성해주세요** (필수!)
2. 문장 길이를 다양하게 하고, 개인적인 의견도 포함해주세요
3. 독자와 대화하듯 친근하게 써주세요
4. 각 섹션마다 구체적인 예시와 팁을 풍부하게 포함해주세요
5. 서론에서 독자의 공감을 이끌어내고, 결론에서 핵심을 정리해주세요
6. 각 본론 섹션은 최소 300자 이상으로 작성해주세요
`;

  // 최대 2번 시도 (처음 + 재시도 1회)
  let attempts = 0;
  const maxAttempts = 2;
  let text = '';

  while (attempts < maxAttempts) {
    const isRetry = attempts > 0;
    const userMessage = buildPrompt(isRetry, isRetry ? text.length : undefined);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 6000,
      system: AGENT_PROMPTS.writer,
      messages: [{ role: 'user', content: userMessage }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('예상치 못한 응답 형식');
    }

    text = content.text;
    attempts++;

    // 1500자 이상이면 성공
    if (text.length >= MIN_CONTENT_LENGTH) {
      break;
    }

    console.log(`작가 에이전트: ${text.length}자 작성됨 (최소 ${MIN_CONTENT_LENGTH}자 필요), 재시도 ${attempts}/${maxAttempts}`);
  }

  // 최종 검증
  if (text.length < MIN_CONTENT_LENGTH) {
    console.warn(`경고: 최종 글 분량이 ${text.length}자로 최소 기준(${MIN_CONTENT_LENGTH}자) 미달`);
  }

  return {
    content: text,
    wordCount: text.length
  };
}

// 에이전트 C: 교정자 실행
export async function runEditor(draft: string): Promise<EditorOutput> {
  const userMessage = `
다음 글을 교정해주세요. 반복되는 단어를 유의어로 바꾸고, 불필요한 수식어를 제거하며, 가독성을 높여주세요.
원문의 개성과 톤은 유지해주세요.

---

${draft}

---

교정이 완료된 마크다운 텍스트만 출력해주세요.
`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system: AGENT_PROMPTS.editor,
    messages: [{ role: 'user', content: userMessage }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  return {
    content: content.text,
    changes: [] // 실제 변경 사항 추적은 추후 구현 가능
  };
}

// 에이전트 D: 검수자 실행
export async function runReviewer(
  content: string,
  strategy: StrategyOutput
): Promise<ReviewerOutput> {
  const contentLength = content.length;
  const userMessage = `
## 원래 전략
- 검색 의도: ${strategy.searchIntent}
- 타겟 독자: ${strategy.targetAudience}
- 메타 설명: ${strategy.metaDescription}

## 검토할 콘텐츠 (현재 ${contentLength}자)
${content}

---

위 콘텐츠가 구글 애드센스 정책에 부합하는지 검토하고, 최종 마크다운을 생성해주세요.

## ⚠️ 글자 수 검증 (필수)
- 현재 콘텐츠: ${contentLength}자
- 최소 기준: ${MIN_CONTENT_LENGTH}자
- ${contentLength >= MIN_CONTENT_LENGTH ? '✅ 분량 기준 충족' : '⛔ 분량 기준 미달 - properLength: false, approved: false 처리 필요'}

JSON 형식으로 출력해주세요.
`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: AGENT_PROMPTS.reviewer,
    messages: [{ role: 'user', content: userMessage }]
  });

  const responseContent = response.content[0];
  if (responseContent.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  const result = parseJSON<ReviewerOutput>(responseContent.text);

  // 최종 분량 검증: 1500자 미만이면 강제로 거부
  const finalLength = result.markdown.length;
  if (finalLength < MIN_CONTENT_LENGTH) {
    result.approved = false;
    result.adsenseCompliance.properLength = false;
    if (!result.suggestions) {
      result.suggestions = [];
    }
    result.suggestions.unshift(`글 분량이 ${finalLength}자로 최소 기준(${MIN_CONTENT_LENGTH}자)에 미달합니다.`);
  }

  return result;
}

// 전체 파이프라인 실행 (스트리밍용)
export type AgentCallback = (
  agent: AgentType,
  status: 'start' | 'complete' | 'image-progress',
  data?: unknown
) => void;

export async function runPipeline(
  topic: string,
  keywords: string[] | undefined,
  onProgress: AgentCallback
): Promise<ReviewerOutput> {
  // 1. 전략가
  onProgress('strategist', 'start');
  const strategy = await runStrategist(topic, keywords);
  onProgress('strategist', 'complete', strategy);

  // 2. 작가
  onProgress('writer', 'start');
  const draft = await runWriter(strategy);
  onProgress('writer', 'complete', draft);

  // 3. 삽화가 (NEW)
  onProgress('illustrator', 'start');
  const illustrated = await runIllustrator(draft, strategy, (current, total) => {
    onProgress('illustrator', 'image-progress', { current, total });
  });
  onProgress('illustrator', 'complete', illustrated);

  // 4. 교정자 (이미지 포함된 콘텐츠 사용)
  onProgress('editor', 'start');
  const edited = await runEditor(illustrated.content);
  onProgress('editor', 'complete', edited);

  // 5. 검수자
  onProgress('reviewer', 'start');
  const final = await runReviewer(edited.content, strategy);
  onProgress('reviewer', 'complete', final);

  return final;
}

// 삽화가 함수 재export (API 라우트에서 사용)
export { runIllustrator };
export type { IllustratorOutput };
