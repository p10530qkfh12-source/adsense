# AI 포스팅 자동화 앱

구글 애드센스 승인을 목표로 하는 인간 중심형 AI 포스팅 자동화 앱입니다.

## 특징

- **4단계 멀티 에이전트 워크플로우**
  - 전략가: SEO 분석 및 콘텐츠 구조 설계
  - 작가: 인간적인 글쓰기 (문장 다양화, 개인 의견, 구어체)
  - 교정자: 반복 제거 및 가독성 향상
  - 검수자: 애드센스 정책 검토 및 최종 확인

- **실시간 진행 상황 표시**
- **마크다운/HTML 미리보기**
- **애드센스 정책 준수 체크**

## 기술 스택

- Next.js 14
- Tailwind CSS
- Lucide React (Icons)
- Claude API (Anthropic SDK)

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일에 ANTHROPIC_API_KEY 추가

# 개발 서버 실행
npm run dev
```

## 환경 변수

```
ANTHROPIC_API_KEY=your-api-key-here
```

## 프로젝트 구조

```
src/
├── app/
│   ├── api/generate/route.ts  # 생성 API (SSE 스트리밍)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # 메인 대시보드
├── components/
│   ├── AgentProgress.tsx      # 에이전트 진행 상황
│   ├── ResultPreview.tsx      # 결과 미리보기
│   └── TopicInput.tsx         # 주제 입력 폼
└── lib/
    ├── agents/
    │   ├── agent-runner.ts    # 에이전트 실행 로직
    │   └── prompts.ts         # 에이전트 프롬프트
    └── types.ts               # 타입 정의
```
