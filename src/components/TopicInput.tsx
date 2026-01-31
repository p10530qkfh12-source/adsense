'use client';

import { useState, FormEvent } from 'react';
import { Sparkles, Plus, X, Loader2, Shuffle, ChevronDown } from 'lucide-react';

// 카테고리별 랜덤 주제 데이터
const TOPIC_CATEGORIES = {
  '생활/라이프스타일': [
    '미니멀 라이프 시작하는 방법',
    '아침 루틴으로 하루를 바꾸는 법',
    '스트레스 해소에 효과적인 취미 5가지',
    '집에서 할 수 있는 홈 카페 만들기',
    '효율적인 옷장 정리 비법',
    '1인 가구 생활비 절약 꿀팁',
    '반려동물과 행복하게 사는 법',
    '계절별 침구 관리 방법',
    '친환경 생활 실천하는 쉬운 방법들',
    '재택근무 생산성 높이는 홈오피스 꾸미기',
  ],
  '건강/웰빙': [
    '초보자를 위한 홈트레이닝 가이드',
    '숙면을 위한 수면 습관 개선법',
    '직장인 목 어깨 통증 스트레칭',
    '면역력 높이는 생활 습관',
    '건강한 식단 구성하는 방법',
    '디지털 디톡스 실천하기',
    '명상 초보자 가이드',
    '눈 건강 지키는 생활 습관',
    '올바른 자세로 허리 건강 지키기',
    '물 마시기 습관의 놀라운 효과',
  ],
  '자기계발': [
    '독서 습관 만들기 실전 가이드',
    '시간 관리 잘하는 사람들의 비밀',
    '새해 목표 달성하는 구체적인 방법',
    '영어 공부 효율적으로 하는 법',
    '글쓰기 실력 향상시키는 방법',
    '프레젠테이션 잘하는 법',
    '인간관계 개선을 위한 대화법',
    '집중력 높이는 환경 만들기',
    '번아웃 극복하고 동기부여 찾기',
    '성공하는 사람들의 아침 습관',
  ],
  '재테크/경제': [
    '사회초년생 재테크 시작하기',
    '월급 관리 잘하는 통장 쪼개기',
    '주린이를 위한 주식 기초 가이드',
    '생활비 절약하는 현실적인 방법',
    'ETF 투자 입문 가이드',
    '신용점수 올리는 방법',
    '연말정산 환급 많이 받는 팁',
    '부업으로 추가 수입 만들기',
    '적금 vs 예금 뭐가 더 좋을까',
    '경제 뉴스 쉽게 읽는 방법',
  ],
  'IT/테크': [
    '스마트폰 배터리 오래 쓰는 법',
    '컴퓨터 속도 빠르게 만드는 방법',
    '개인정보 보호를 위한 보안 설정',
    '유용한 무료 앱 추천',
    '클라우드 서비스 활용법',
    '노션으로 생산성 높이기',
    'AI 도구 활용한 업무 효율화',
    '유튜브 알고리즘 이해하기',
    '스마트홈 입문 가이드',
    '디지털 사진 정리하는 방법',
  ],
  '여행/문화': [
    '국내 당일치기 여행지 추천',
    '혼자 여행 처음 가는 사람을 위한 팁',
    '여행 짐 싸는 효율적인 방법',
    '비행기 좌석 잘 고르는 법',
    '해외여행 환전 꿀팁',
    '캠핑 초보 필수 준비물',
    '미술관 제대로 즐기는 방법',
    '공연 티켓팅 성공하는 노하우',
    '맛집 찾는 나만의 방법',
    '여행 사진 잘 찍는 팁',
  ],
  '요리/음식': [
    '자취생 간단 요리 레시피',
    '냉장고 파먹기 요리법',
    '밀프렙으로 일주일 식단 준비하기',
    '에어프라이어 활용 레시피',
    '커피 맛있게 내리는 방법',
    '도시락 맛있게 싸는 법',
    '건강한 간식 만들기',
    '초보도 성공하는 베이킹',
    '제철 재료 고르는 방법',
    '음식 맛있게 보관하는 팁',
  ],
  '육아/교육': [
    '아이와 함께하는 집콕 놀이',
    '초등학생 공부 습관 만들기',
    '아이 책 읽기 습관 들이는 법',
    '용돈 교육으로 경제 관념 키우기',
    '아이와 대화 잘하는 방법',
    '어린이 스마트폰 사용 지도법',
    '방학 알차게 보내는 방법',
    '아이 창의력 키우는 놀이',
    '학부모 상담 준비하는 법',
    '형제자매 갈등 해결하기',
  ],
};

interface TopicInputProps {
  onSubmit: (topic: string, keywords: string[]) => void;
  isLoading: boolean;
}

export default function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading) {
      onSubmit(topic.trim(), keywords);
    }
  };

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (keyword && !keywords.includes(keyword)) {
      setKeywords([...keywords, keyword]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  // 전체 카테고리에서 랜덤 주제 선택
  const getRandomTopic = () => {
    const allTopics = Object.values(TOPIC_CATEGORIES).flat();
    const randomIndex = Math.floor(Math.random() * allTopics.length);
    setTopic(allTopics[randomIndex]);
    setShowCategories(false);
  };

  // 특정 카테고리에서 랜덤 주제 선택
  const getRandomTopicFromCategory = (category: string) => {
    const topics = TOPIC_CATEGORIES[category as keyof typeof TOPIC_CATEGORIES];
    const randomIndex = Math.floor(Math.random() * topics.length);
    setTopic(topics[randomIndex]);
    setSelectedCategory(category);
    setShowCategories(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 주제 입력 */}
      <div>
        <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-2">
          블로그 주제
        </label>
        <div className="flex gap-2">
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="예: 재택근무 생산성 높이는 방법"
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={getRandomTopic}
            disabled={isLoading}
            className="px-3 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 rounded-lg text-white transition-all"
            title="랜덤 주제 생성"
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <button
          type="button"
          onClick={() => setShowCategories(!showCategories)}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
          카테고리별 주제 선택
          {selectedCategory && (
            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs">
              {selectedCategory}
            </span>
          )}
        </button>

        {showCategories && (
          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(TOPIC_CATEGORIES).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => getRandomTopicFromCategory(category)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    selectedCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              카테고리를 클릭하면 해당 분야의 랜덤 주제가 선택됩니다
            </p>
          </div>
        )}
      </div>

      {/* 키워드 입력 */}
      <div>
        <label htmlFor="keywords" className="block text-sm font-medium text-gray-300 mb-2">
          추가 키워드 (선택)
        </label>
        <div className="flex gap-2">
          <input
            id="keywords"
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="키워드 입력 후 Enter"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
            disabled={isLoading}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* 키워드 태그 */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="flex items-center gap-1 px-2 py-1 bg-purple-900/40 text-purple-300 rounded-full text-sm"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="hover:text-purple-100 transition-colors"
                  disabled={isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 생성 버튼 */}
      <button
        type="submit"
        disabled={!topic.trim() || isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            콘텐츠 생성 중...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            콘텐츠 생성하기
          </>
        )}
      </button>
    </form>
  );
}
