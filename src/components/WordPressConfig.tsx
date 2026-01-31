'use client';

import { useState, useEffect } from 'react';
import { Globe, Key, User, CheckCircle, XCircle, Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export interface WordPressSettings {
  siteUrl: string;
  username: string;
  appPassword: string;
}

interface WordPressConfigProps {
  onConfigChange: (config: WordPressSettings | null) => void;
}

export default function WordPressConfig({ onConfigChange }: WordPressConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<WordPressSettings>({
    siteUrl: '',
    username: '',
    appPassword: '',
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // 로컬 스토리지에서 설정 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('wordpress_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        if (parsed.siteUrl && parsed.username && parsed.appPassword) {
          onConfigChange(parsed);
          setConnectionStatus('success');
        }
      } catch {
        // 무시
      }
    }
  }, [onConfigChange]);

  const handleChange = (field: keyof WordPressSettings, value: string) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    setConnectionStatus('idle');
  };

  const testConnection = async () => {
    if (!config.siteUrl || !config.username || !config.appPassword) {
      setErrorMessage('모든 필드를 입력해주세요.');
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('testing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          config,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('success');
        // 설정 저장
        localStorage.setItem('wordpress_config', JSON.stringify(config));
        onConfigChange(config);
        if (data.userInfo) {
          setErrorMessage(`${data.userInfo.name}님으로 연결되었습니다.`);
        }
      } else {
        setConnectionStatus('error');
        setErrorMessage(data.message || data.error || '연결에 실패했습니다.');
        onConfigChange(null);
      }
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '연결 테스트 중 오류 발생');
      onConfigChange(null);
    }
  };

  const clearConfig = () => {
    setConfig({ siteUrl: '', username: '', appPassword: '' });
    setConnectionStatus('idle');
    localStorage.removeItem('wordpress_config');
    onConfigChange(null);
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
      {/* 헤더 (토글) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-900/50 rounded-lg">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-200">워드프레스 연동</h3>
            <p className="text-xs text-gray-500">
              {connectionStatus === 'success' ? '연결됨' : '생성된 콘텐츠를 워드프레스에 바로 게시'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus === 'success' && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* 설정 폼 */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* 사이트 URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              워드프레스 사이트 URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="url"
                value={config.siteUrl}
                onChange={(e) => handleChange('siteUrl', e.target.value)}
                placeholder="https://your-site.com"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 사용자명 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              사용자명
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={config.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 앱 비밀번호 */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              앱 비밀번호
              <a
                href="https://wordpress.org/documentation/article/application-passwords/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-400 hover:text-blue-300"
              >
                (발급 방법)
              </a>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="password"
                value={config.appPassword}
                onChange={(e) => handleChange('appPassword', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {connectionStatus === 'error' && errorMessage && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 p-3 rounded-lg">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* 성공 메시지 */}
          {connectionStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {errorMessage || '워드프레스에 연결되었습니다!'}
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-2">
            <button
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {connectionStatus === 'testing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  연결 테스트 중...
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  연결 테스트
                </>
              )}
            </button>
            {connectionStatus === 'success' && (
              <button
                onClick={clearConfig}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
              >
                연결 해제
              </button>
            )}
          </div>

          {/* 안내 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>* 앱 비밀번호 발급 방법:</p>
            <p className="pl-2">1. 워드프레스 관리자 로그인</p>
            <p className="pl-2">2. 사용자 → 프로필 → 앱 비밀번호</p>
            <p className="pl-2">3. 새 앱 비밀번호 이름 입력 후 생성</p>
            <p className="pl-2">4. 생성된 비밀번호 복사 (공백 포함해도 OK)</p>
            <p className="mt-2 text-yellow-500/80">⚠️ 앱 비밀번호가 없다면 워드프레스 5.6 이상인지, SSL(https)이 적용되어 있는지 확인하세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
