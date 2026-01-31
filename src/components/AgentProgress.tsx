'use client';

import {
  Brain,
  PenTool,
  FileEdit,
  CheckCircle,
  Loader2,
  Circle,
  AlertCircle,
  ImageIcon
} from 'lucide-react';
import type { AgentType, AgentStatus } from '@/lib/types';

const AGENT_CONFIG: Record<AgentType, {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  color: string;
}> = {
  strategist: {
    icon: Brain,
    name: '전략가',
    description: 'SEO 분석 및 구조 설계',
    color: 'text-purple-400',
  },
  writer: {
    icon: PenTool,
    name: '작가',
    description: '인간적인 글쓰기',
    color: 'text-blue-400',
  },
  illustrator: {
    icon: ImageIcon,
    name: '삽화가',
    description: 'AI 이미지 생성',
    color: 'text-pink-400',
  },
  editor: {
    icon: FileEdit,
    name: '교정자',
    description: '가독성 향상 및 교정',
    color: 'text-yellow-400',
  },
  reviewer: {
    icon: CheckCircle,
    name: '검수자',
    description: '애드센스 정책 검토',
    color: 'text-green-400',
  },
};

interface AgentProgressProps {
  agents: AgentStatus[];
  imageProgress?: { current: number; total: number } | null;
}

export default function AgentProgress({ agents, imageProgress }: AgentProgressProps) {
  const agentOrder: AgentType[] = ['strategist', 'writer', 'illustrator', 'editor', 'reviewer'];

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold mb-4 text-gray-200">
        에이전트 진행 상황
      </h2>

      <div className="space-y-4">
        {agentOrder.map((agentType, index) => {
          const config = AGENT_CONFIG[agentType];
          const status = agents.find(a => a.agent === agentType);
          const Icon = config.icon;

          // 상태 아이콘 결정
          let StatusIcon = Circle;
          let statusColor = 'text-gray-600';
          let bgColor = 'bg-gray-800/50';
          let borderColor = 'border-gray-700';

          if (status?.status === 'running') {
            StatusIcon = Loader2;
            statusColor = config.color;
            bgColor = 'bg-gray-800';
            borderColor = 'border-gray-600';
          } else if (status?.status === 'completed') {
            StatusIcon = CheckCircle;
            statusColor = 'text-green-500';
            bgColor = 'bg-green-900/20';
            borderColor = 'border-green-800';
          } else if (status?.status === 'error') {
            StatusIcon = AlertCircle;
            statusColor = 'text-red-500';
            bgColor = 'bg-red-900/20';
            borderColor = 'border-red-800';
          }

          return (
            <div key={agentType} className="relative">
              {/* 연결선 */}
              {index < agentOrder.length - 1 && (
                <div
                  className={`absolute left-5 top-12 w-0.5 h-4 ${
                    status?.status === 'completed' ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                />
              )}

              <div className={`flex items-center gap-4 p-4 rounded-lg border ${bgColor} ${borderColor} transition-all duration-300`}>
                {/* 에이전트 아이콘 */}
                <div className={`p-2 rounded-lg bg-gray-800 ${config.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* 에이전트 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-200">
                      {config.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {config.description}
                    </span>
                  </div>

                  {status?.message && (
                    <p className={`text-sm mt-1 truncate ${
                      status.status === 'error' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {status.message}
                    </p>
                  )}

                  {/* 이미지 생성 진행률 바 */}
                  {agentType === 'illustrator' && imageProgress && status?.status === 'running' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-pink-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(imageProgress.current / imageProgress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        이미지 {imageProgress.current}/{imageProgress.total} 생성 중
                      </p>
                    </div>
                  )}
                </div>

                {/* 상태 아이콘 */}
                <StatusIcon
                  className={`w-5 h-5 ${statusColor} ${
                    status?.status === 'running' ? 'animate-spin' : ''
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
