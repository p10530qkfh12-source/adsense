import Anthropic from '@anthropic-ai/sdk';
import { AGENT_PROMPTS } from './prompts';
import type {
  AgentType,
  StrategyOutput,
  WriterOutput,
  EditorOutput,
  ReviewerOutput
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

// 에이전트 B: 작가 실행
export async function runWriter(strategy: StrategyOutput): Promise<WriterOutput> {
  const userMessage = `
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
문장 길이를 다양하게 하고, 개인적인 의견도 포함하며, 독자와 대화하듯 써주세요.
`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: AGENT_PROMPTS.writer,
    messages: [{ role: 'user', content: userMessage }]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  const text = content.text;
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
    max_tokens: 4000,
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
  const userMessage = `
## 원래 전략
- 검색 의도: ${strategy.searchIntent}
- 타겟 독자: ${strategy.targetAudience}
- 메타 설명: ${strategy.metaDescription}

## 검토할 콘텐츠
${content}

---

위 콘텐츠가 구글 애드센스 정책에 부합하는지 검토하고, 최종 마크다운을 생성해주세요.
JSON 형식으로 출력해주세요.
`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 5000,
    system: AGENT_PROMPTS.reviewer,
    messages: [{ role: 'user', content: userMessage }]
  });

  const responseContent = response.content[0];
  if (responseContent.type !== 'text') {
    throw new Error('예상치 못한 응답 형식');
  }

  return parseJSON<ReviewerOutput>(responseContent.text);
}

// 전체 파이프라인 실행 (스트리밍용)
export type AgentCallback = (agent: AgentType, status: 'start' | 'complete', data?: unknown) => void;

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

  // 3. 교정자
  onProgress('editor', 'start');
  const edited = await runEditor(draft.content);
  onProgress('editor', 'complete', edited);

  // 4. 검수자
  onProgress('reviewer', 'start');
  const final = await runReviewer(edited.content, strategy);
  onProgress('reviewer', 'complete', final);

  return final;
}
