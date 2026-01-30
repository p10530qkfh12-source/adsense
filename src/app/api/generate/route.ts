import { NextRequest } from 'next/server';
import {
  runStrategist,
  runWriter,
  runEditor,
  runReviewer
} from '@/lib/agents/agent-runner';
import { AGENT_NAMES, AGENT_DESCRIPTIONS } from '@/lib/agents/prompts';
import type { AgentType, StrategyOutput } from '@/lib/types';

// 스트리밍 응답을 위한 헬퍼
function createSSEMessage(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, keywords } = body;

    if (!topic || typeof topic !== 'string') {
      return new Response(
        JSON.stringify({ error: '주제를 입력해주세요.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SSE 스트림 설정
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(createSSEMessage(data)));
        };

        try {
          let strategy: StrategyOutput;

          // 에이전트 A: 전략가
          send({
            type: 'status',
            agent: 'strategist' as AgentType,
            status: 'running',
            message: `${AGENT_NAMES.strategist}: ${AGENT_DESCRIPTIONS.strategist}`,
          });

          try {
            strategy = await runStrategist(topic, keywords);
            send({
              type: 'output',
              agent: 'strategist' as AgentType,
              data: strategy,
            });
            send({
              type: 'status',
              agent: 'strategist' as AgentType,
              status: 'completed',
              message: `${AGENT_NAMES.strategist}: 구조 설계 완료`,
            });
          } catch (err) {
            send({
              type: 'status',
              agent: 'strategist' as AgentType,
              status: 'error',
              message: `전략가 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
            });
            throw err;
          }

          // 에이전트 B: 작가
          send({
            type: 'status',
            agent: 'writer' as AgentType,
            status: 'running',
            message: `${AGENT_NAMES.writer}: ${AGENT_DESCRIPTIONS.writer}`,
          });

          let draft;
          try {
            draft = await runWriter(strategy);
            send({
              type: 'output',
              agent: 'writer' as AgentType,
              data: { wordCount: draft.wordCount },
            });
            send({
              type: 'status',
              agent: 'writer' as AgentType,
              status: 'completed',
              message: `${AGENT_NAMES.writer}: 초안 작성 완료 (${draft.wordCount}자)`,
            });
          } catch (err) {
            send({
              type: 'status',
              agent: 'writer' as AgentType,
              status: 'error',
              message: `작가 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
            });
            throw err;
          }

          // 에이전트 C: 교정자
          send({
            type: 'status',
            agent: 'editor' as AgentType,
            status: 'running',
            message: `${AGENT_NAMES.editor}: ${AGENT_DESCRIPTIONS.editor}`,
          });

          let edited;
          try {
            edited = await runEditor(draft.content);
            send({
              type: 'status',
              agent: 'editor' as AgentType,
              status: 'completed',
              message: `${AGENT_NAMES.editor}: 교정 완료`,
            });
          } catch (err) {
            send({
              type: 'status',
              agent: 'editor' as AgentType,
              status: 'error',
              message: `교정자 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
            });
            throw err;
          }

          // 에이전트 D: 검수자
          send({
            type: 'status',
            agent: 'reviewer' as AgentType,
            status: 'running',
            message: `${AGENT_NAMES.reviewer}: ${AGENT_DESCRIPTIONS.reviewer}`,
          });

          let final;
          try {
            final = await runReviewer(edited.content, strategy);
            send({
              type: 'status',
              agent: 'reviewer' as AgentType,
              status: 'completed',
              message: `${AGENT_NAMES.reviewer}: 최종 검토 완료`,
            });
          } catch (err) {
            send({
              type: 'status',
              agent: 'reviewer' as AgentType,
              status: 'error',
              message: `검수자 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
            });
            throw err;
          }

          // 최종 결과 전송
          send({
            type: 'complete',
            data: {
              approved: final.approved,
              markdown: final.markdown,
              adsenseCompliance: final.adsenseCompliance,
              suggestions: final.suggestions,
            },
          });

        } catch (error) {
          send({
            type: 'error',
            message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API 오류:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
