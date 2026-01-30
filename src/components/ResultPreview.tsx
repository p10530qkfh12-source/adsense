'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, FileText, Code, CheckCircle, XCircle } from 'lucide-react';

interface AdsenseCompliance {
  originalContent: boolean;
  hasValue: boolean;
  properLength: boolean;
  noSpam: boolean;
}

interface ResultPreviewProps {
  markdown: string;
  approved?: boolean;
  compliance?: AdsenseCompliance;
  suggestions?: string[];
}

export default function ResultPreview({
  markdown,
  approved,
  compliance,
  suggestions
}: ResultPreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 마크다운을 HTML로 변환 (간단한 미리보기용)
  const htmlContent = markdown;

  const complianceItems = compliance ? [
    { key: 'originalContent', label: '독창적 콘텐츠', value: compliance.originalContent },
    { key: 'hasValue', label: '가치 제공', value: compliance.hasValue },
    { key: 'properLength', label: '적절한 길이', value: compliance.properLength },
    { key: 'noSpam', label: '스팸 없음', value: compliance.noSpam },
  ] : [];

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {/* 탭 전환 */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'preview'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              미리보기
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'markdown'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Code className="w-4 h-4" />
              마크다운
            </button>
          </div>

          {/* 승인 상태 배지 */}
          {approved !== undefined && (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              approved
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
            }`}>
              {approved ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  승인 가능
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  수정 필요
                </>
              )}
            </span>
          )}
        </div>

        {/* 복사 버튼 */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              복사됨!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              복사하기
            </>
          )}
        </button>
      </div>

      {/* 애드센스 정책 준수 체크 */}
      {compliance && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/30">
          <p className="text-xs text-gray-500 mb-2">애드센스 정책 준수 상태</p>
          <div className="flex flex-wrap gap-2">
            {complianceItems.map((item) => (
              <span
                key={item.key}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                  item.value
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {item.value ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 콘텐츠 영역 */}
      <div className="p-6 max-h-[600px] overflow-y-auto">
        {viewMode === 'preview' ? (
          <div className="markdown-preview prose prose-invert max-w-none">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800/50 p-4 rounded-lg">
            {markdown}
          </pre>
        )}
      </div>

      {/* 개선 제안 */}
      {suggestions && suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800 bg-yellow-900/10">
          <p className="text-xs text-yellow-500 mb-2">개선 제안</p>
          <ul className="list-disc list-inside text-sm text-yellow-300/80 space-y-1">
            {suggestions.map((suggestion, i) => (
              <li key={i}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
