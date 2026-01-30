'use client';

import { useState, useCallback } from 'react';
import { Bot, Zap, Shield, Sparkles } from 'lucide-react';
import TopicInput from '@/components/TopicInput';
import AgentProgress from '@/components/AgentProgress';
import ResultPreview from '@/components/ResultPreview';
import type { AgentStatus, AgentType } from '@/lib/types';

interface GenerationResult {
  approved: boolean;
  markdown: string;
  adsenseCompliance: {
    originalContent: boolean;
    hasValue: boolean;
    properLength: boolean;
    noSpam: boolean;
  };
  suggestions?: string[];
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (topic: string, keywords: string[]) => {
    setIsLoading(true);
    setAgents([]);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, keywords }),
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('스트림 읽기 실패');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                setAgents((prev) => {
                  const existing = prev.find((a) => a.agent === data.agent);
                  if (existing) {
                    return prev.map((a) =>
                      a.agent === data.agent
                        ? { ...a, status: data.status, message: data.message }
                        : a
                    );
                  }
                  return [
                    ...prev,
                    {
                      agent: data.agent as AgentType,
                      status: data.status,
                      message: data.message,
                    },
                  ];
                });
              } else if (data.type === 'complete') {
                setResult(data.data);
              } else if (data.type === 'error') {
                setError(data.message);
              }
            } catch {
              // JSON 파싱 오류 무시
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      {/* 헤더 */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI 포스팅 자동화</h1>
              <p className="text-xs text-gray-500">Human-like Content Generator</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 히어로 섹션 */}
        {!isLoading && !result && (
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              애드센스 승인을 위한<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                인간 중심형 AI 글쓰기
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto mb-8">
              4단계 멀티 에이전트 워크플로우가 SEO 최적화된 고품질 콘텐츠를 생성합니다.
              AI 특유의 딱딱함 없이, 사람이 쓴 것처럼 자연스러운 글을 만들어보세요.
            </p>

            {/* 특징 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="font-medium text-white mb-1">4단계 AI 파이프라인</h3>
                <p className="text-sm text-gray-400">전략-작성-교정-검수</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="font-medium text-white mb-1">인간적인 글쓰기</h3>
                <p className="text-sm text-gray-400">개성 있는 문체와 의견</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="font-medium text-white mb-1">애드센스 정책 준수</h3>
                <p className="text-sm text-gray-400">자동 정책 검토</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 입력 및 진행 상황 */}
          <div className="space-y-6">
            {/* 입력 폼 */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">
                콘텐츠 생성
              </h2>
              <TopicInput onSubmit={handleGenerate} isLoading={isLoading} />
            </div>

            {/* 진행 상황 */}
            {(isLoading || agents.length > 0) && (
              <AgentProgress agents={agents} />
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* 오른쪽: 결과 미리보기 */}
          <div>
            {result ? (
              <ResultPreview
                markdown={result.markdown}
                approved={result.approved}
                compliance={result.adsenseCompliance}
                suggestions={result.suggestions}
              />
            ) : (
              <div className="bg-gray-900/30 rounded-xl border border-gray-800 border-dashed p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <Bot className="w-16 h-16 text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  결과가 여기에 표시됩니다
                </h3>
                <p className="text-sm text-gray-600">
                  주제를 입력하고 생성 버튼을 눌러주세요
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 사용 방법 (결과가 없을 때만) */}
        {!result && !isLoading && (
          <div className="mt-12 p-6 bg-gray-900/30 rounded-xl border border-gray-800">
            <h3 className="font-semibold text-gray-300 mb-4">에이전트 워크플로우</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/50 text-purple-400 flex items-center justify-center text-xs font-bold">A</span>
                <div>
                  <p className="font-medium text-gray-300">전략가</p>
                  <p className="text-gray-500">검색 의도 분석, SEO 최적화 구조 설계</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-900/50 text-blue-400 flex items-center justify-center text-xs font-bold">B</span>
                <div>
                  <p className="font-medium text-gray-300">작가</p>
                  <p className="text-gray-500">문장 다양화, 개인 의견, 구어체 혼용</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-900/50 text-yellow-400 flex items-center justify-center text-xs font-bold">C</span>
                <div>
                  <p className="font-medium text-gray-300">교정자</p>
                  <p className="text-gray-500">반복 제거, 유의어 교체, 가독성 향상</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center text-xs font-bold">D</span>
                <div>
                  <p className="font-medium text-gray-300">검수자</p>
                  <p className="text-gray-500">애드센스 정책 검토, 최종 마크다운 생성</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-600">
            Powered by Claude API | 인간 중심형 AI 콘텐츠 생성기
          </p>
        </div>
      </footer>
    </main>
  );
}
