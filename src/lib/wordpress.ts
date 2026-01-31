// WordPress REST API 연동

export interface WordPressConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface WordPressPostData {
  title: string;
  content: string;
  status?: 'publish' | 'draft' | 'pending';
  categories?: number[];
  tags?: number[];
}

export interface WordPressPostResponse {
  id: number;
  link: string;
  status: string;
  title: { rendered: string };
}

// 마크다운에서 제목 추출
export function extractTitleFromMarkdown(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '제목 없음';
}

// 마크다운을 HTML로 변환
export function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^#\s+.+$/m, '')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, '').trim();
      return `<pre><code>${code}</code></pre>`;
    })
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .split('\n\n')
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<h') || para.startsWith('<li') ||
          para.startsWith('<blockquote') || para.startsWith('<pre')) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  html = html.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  return html.trim();
}

// URL 정규화
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// 앱 비밀번호 정규화 (공백 제거)
function normalizeAppPassword(password: string): string {
  return password.replace(/\s+/g, '');
}

// REST API URL 형식 확인 (pretty permalink vs query string)
async function detectRestApiFormat(baseUrl: string): Promise<'pretty' | 'query'> {
  // 먼저 pretty permalink 형식 시도
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/wp-json/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return 'pretty';
      }
    }
  } catch {
    // pretty 형식 실패, query 형식 시도
  }

  // query string 형식 확인
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/index.php?rest_route=/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return 'query';
    }
  } catch {
    // 무시
  }

  // 기본값으로 pretty 형식 반환 (대부분의 WordPress 사이트가 이 형식 사용)
  return 'pretty';
}

// REST API 엔드포인트 URL 생성
function buildApiUrl(baseUrl: string, format: 'pretty' | 'query', endpoint: string): string {
  if (format === 'pretty') {
    return `${baseUrl}/wp-json/wp/v2${endpoint}`;
  }
  return `${baseUrl}/index.php?rest_route=/wp/v2${endpoint}`;
}

// WordPress에 포스트 생성
export async function createWordPressPost(
  config: WordPressConfig,
  postData: WordPressPostData
): Promise<WordPressPostResponse> {
  const { siteUrl, username, appPassword } = config;

  if (!siteUrl || !username || !appPassword) {
    throw new Error('WordPress 설정이 완료되지 않았습니다.');
  }

  const baseUrl = normalizeUrl(siteUrl);
  const normalizedPassword = normalizeAppPassword(appPassword);

  let format: 'pretty' | 'query';
  try {
    format = await detectRestApiFormat(baseUrl);
  } catch (error) {
    console.error('REST API 형식 감지 실패:', error);
    format = 'pretty'; // 기본값
  }

  const apiUrl = buildApiUrl(baseUrl, format, '/posts');
  const authHeader = Buffer.from(`${username}:${normalizedPassword}`).toString('base64');

  console.log('WordPress API 요청:', apiUrl, 'format:', format);

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        title: postData.title,
        content: postData.content,
        status: postData.status || 'draft',
        categories: postData.categories,
        tags: postData.tags,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
    }
    throw new Error(`WordPress 서버에 연결할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `WordPress API 오류 (${response.status})`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      } else if (errorJson.code) {
        switch (errorJson.code) {
          case 'rest_cannot_create':
            errorMessage = '글 작성 권한이 없습니다. 사용자 권한을 확인해주세요.';
            break;
          case 'rest_forbidden':
            errorMessage = '접근이 거부되었습니다. 인증 정보를 확인해주세요.';
            break;
          case 'rest_cookie_invalid_nonce':
            errorMessage = '인증이 만료되었습니다. 다시 연결해주세요.';
            break;
          default:
            errorMessage = `오류 코드: ${errorJson.code}`;
        }
      }
    } catch {
      if (response.status === 401) {
        errorMessage = '인증 실패: 사용자명 또는 앱 비밀번호가 올바르지 않습니다.';
      } else if (response.status === 403) {
        errorMessage = '권한 없음: REST API 접근이 차단되었거나 권한이 부족합니다.';
      } else if (response.status === 404) {
        errorMessage = 'API를 찾을 수 없습니다. 사이트 URL을 확인해주세요.';
      } else if (response.status >= 500) {
        errorMessage = 'WordPress 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// WordPress 연결 테스트
export async function testWordPressConnection(
  config: WordPressConfig
): Promise<{ success: boolean; message: string; userInfo?: { name: string; roles: string[] } }> {
  const { siteUrl, username, appPassword } = config;

  const baseUrl = normalizeUrl(siteUrl);
  const normalizedPassword = normalizeAppPassword(appPassword);

  // REST API 형식 감지
  let format: 'pretty' | 'query';
  try {
    format = await detectRestApiFormat(baseUrl);
    console.log('REST API 형식:', format);
  } catch (error) {
    return {
      success: false,
      message: `사이트에 연결할 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }

  // REST API 기본 연결 테스트
  const rootUrl = format === 'pretty'
    ? `${baseUrl}/wp-json/`
    : `${baseUrl}/index.php?rest_route=/`;

  try {
    const rootResponse = await fetch(rootUrl);
    if (!rootResponse.ok) {
      return {
        success: false,
        message: 'WordPress REST API에 접근할 수 없습니다.'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `사이트 연결 실패: ${error instanceof Error ? error.message : '네트워크 오류'}`
    };
  }

  // 사용자 인증 테스트
  const apiUrl = buildApiUrl(baseUrl, format, '/users/me');
  const authHeader = Buffer.from(`${username}:${normalizedPassword}`).toString('base64');

  console.log('인증 테스트 URL:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return {
        success: true,
        message: '연결 성공!',
        userInfo: {
          name: userData.name || username,
          roles: userData.roles || []
        }
      };
    } else {
      const errorText = await response.text();
      let errorMessage = '인증 실패';

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.code === 'invalid_username') {
          errorMessage = '사용자명이 올바르지 않습니다.';
        } else if (errorJson.code === 'incorrect_password') {
          errorMessage = '앱 비밀번호가 올바르지 않습니다.';
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        if (response.status === 401) {
          errorMessage = '사용자명 또는 앱 비밀번호가 올바르지 않습니다.';
        }
      }

      return { success: false, message: errorMessage };
    }
  } catch (error) {
    return {
      success: false,
      message: `연결 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    };
  }
}
