import OpenAI from 'openai';
import type { ImageGenerationResult } from './types';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 이미지 생성 기본 설정
const IMAGE_CONFIG = {
  model: 'dall-e-3' as const,
  size: '1024x1024' as const,
  quality: 'standard' as const,
  style: 'natural' as const,
};

// 지수 백오프 대기
function exponentialBackoff(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * DALL-E 3를 사용하여 이미지 생성
 * @param prompt 이미지 생성 프롬프트 (영문 권장)
 * @param retries 재시도 횟수 (기본 3회)
 * @returns Base64 데이터 URL 또는 에러
 */
export async function generateImage(
  prompt: string,
  retries: number = 3
): Promise<ImageGenerationResult> {
  // API 키 확인
  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API 키가 설정되지 않았습니다.',
    };
  }

  // 프롬프트 안전성 강화
  const safePrompt = `${prompt}. No text, no words, no letters, no watermarks. Clean, professional blog image.`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`이미지 생성 시도 ${attempt + 1}/${retries}: ${prompt.substring(0, 50)}...`);

      const response = await openai.images.generate({
        model: IMAGE_CONFIG.model,
        prompt: safePrompt,
        n: 1,
        size: IMAGE_CONFIG.size,
        quality: IMAGE_CONFIG.quality,
        style: IMAGE_CONFIG.style,
        response_format: 'b64_json',
      });

      if (!response.data || !response.data[0]) {
        throw new Error('이미지 응답 데이터가 없습니다.');
      }

      const imageData = response.data[0];

      if (!imageData.b64_json) {
        throw new Error('이미지 데이터가 없습니다.');
      }

      // Base64 데이터 URL 생성
      const imageUrl = `data:image/png;base64,${imageData.b64_json}`;

      console.log(`이미지 생성 성공 (시도 ${attempt + 1})`);

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error(`이미지 생성 실패 (시도 ${attempt + 1}/${retries}):`, errorMessage);

      // OpenAI 특정 에러 처리
      if (error instanceof OpenAI.APIError) {
        // 콘텐츠 정책 위반 - 재시도 불필요
        if (error.status === 400 && error.message.includes('safety')) {
          return {
            success: false,
            error: '이미지 생성 정책에 위배되는 프롬프트입니다.',
          };
        }

        // Rate limit - 재시도
        if (error.status === 429) {
          console.log('Rate limit 도달, 대기 중...');
          await exponentialBackoff(attempt + 2); // 더 긴 대기
          continue;
        }

        // 인증 오류 - 재시도 불필요
        if (error.status === 401) {
          return {
            success: false,
            error: 'OpenAI API 키가 유효하지 않습니다.',
          };
        }
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < retries - 1) {
        await exponentialBackoff(attempt);
        continue;
      }

      // 모든 재시도 실패
      return {
        success: false,
        error: `이미지 생성 실패 (${retries}회 시도): ${errorMessage}`,
      };
    }
  }

  return {
    success: false,
    error: '이미지 생성에 실패했습니다.',
  };
}

/**
 * 여러 이미지를 순차적으로 생성
 * @param prompts 프롬프트 배열
 * @param onProgress 진행률 콜백
 * @returns 생성된 이미지 URL 배열 (실패한 경우 null)
 */
export async function generateMultipleImages(
  prompts: string[],
  onProgress?: (current: number, total: number) => void
): Promise<(string | null)[]> {
  const results: (string | null)[] = [];
  const total = prompts.length;

  for (let i = 0; i < prompts.length; i++) {
    // 진행률 알림
    if (onProgress) {
      onProgress(i + 1, total);
    }

    const result = await generateImage(prompts[i]);
    results.push(result.success ? result.imageUrl! : null);

    // Rate limit 방지를 위한 딜레이 (마지막 제외)
    if (i < prompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
