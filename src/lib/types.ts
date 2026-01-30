// 에이전트 타입 정의
export type AgentType = 'strategist' | 'writer' | 'editor' | 'reviewer';

export interface AgentStatus {
  agent: AgentType;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  output?: string;
  timestamp?: number;
}

export interface GenerationRequest {
  topic: string;
  keywords?: string[];
  tone?: 'formal' | 'casual' | 'mixed';
}

export interface GenerationResponse {
  success: boolean;
  markdown?: string;
  html?: string;
  stages?: AgentStatus[];
  error?: string;
}

export interface StrategyOutput {
  searchIntent: string;
  targetAudience: string;
  outline: {
    introduction: string[];
    body: { heading: string; points: string[] }[];
    conclusion: string[];
  };
  keywords: string[];
  metaDescription: string;
}

export interface WriterOutput {
  content: string;
  wordCount: number;
}

export interface EditorOutput {
  content: string;
  changes: string[];
}

export interface ReviewerOutput {
  approved: boolean;
  markdown: string;
  suggestions?: string[];
  adsenseCompliance: {
    originalContent: boolean;
    hasValue: boolean;
    properLength: boolean;
    noSpam: boolean;
  };
}

// 스트리밍 이벤트 타입
export interface StreamEvent {
  type: 'status' | 'output' | 'complete' | 'error';
  agent?: AgentType;
  status?: AgentStatus['status'];
  message?: string;
  data?: string;
}
