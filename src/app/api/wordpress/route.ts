import { NextRequest, NextResponse } from 'next/server';
import {
  createWordPressPost,
  testWordPressConnection,
  extractTitleFromMarkdown,
  markdownToHtml,
  WordPressConfig,
} from '@/lib/wordpress';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, markdown, status } = body;

    if (!config?.siteUrl || !config?.username || !config?.appPassword) {
      return NextResponse.json(
        { error: '워드프레스 설정이 필요합니다. (사이트 URL, 사용자명, 앱 비밀번호)' },
        { status: 400 }
      );
    }

    const wpConfig: WordPressConfig = {
      siteUrl: config.siteUrl,
      username: config.username,
      appPassword: config.appPassword,
    };

    // 연결 테스트
    if (action === 'test') {
      const result = await testWordPressConnection(wpConfig);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        userInfo: result.userInfo
      });
    }

    // 포스트 발행
    if (action === 'publish') {
      if (!markdown) {
        return NextResponse.json(
          { error: '발행할 콘텐츠가 없습니다.' },
          { status: 400 }
        );
      }

      try {
        const title = extractTitleFromMarkdown(markdown);
        const content = markdownToHtml(markdown);

        console.log('발행 시도:', { title, contentLength: content.length });

        const post = await createWordPressPost(wpConfig, {
          title,
          content,
          status: status || 'draft',
        });

        return NextResponse.json({
          success: true,
          post: {
            id: post.id,
            link: post.link,
            status: post.status,
            title: post.title?.rendered || title,
          },
        });
      } catch (error) {
        console.error('WordPress 발행 오류:', error);
        const errorMessage = error instanceof Error ? error.message : '발행 중 오류가 발생했습니다.';
        return NextResponse.json({
          success: false,
          error: errorMessage
        });
      }
    }

    return NextResponse.json(
      { error: '알 수 없는 action입니다.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('WordPress API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
