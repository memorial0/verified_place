// =============================================================================
// 데모용 가상(Mock) 데이터.
// ⚠️ 아래 식당명/인증/추천/문구는 UI 시연을 위한 허구이며 실제 사실과 무관합니다.
//    백엔드 API 연동 시 GET /api/restaurants 응답으로 대체됩니다.
// =============================================================================

/** DDL의 verification_types.code 와 동일한 코드 체계 */
export type VerificationCode = 'michelin' | 'blue_ribbon' | 'centennial' | 'celebrity'

export interface Verification {
  code: VerificationCode
  /** 미슐랭 별 개수 / 블루리본 리본 개수 등 수치 */
  rating?: number
  /** 연예인 픽 추천 출처(가상) */
  recommender?: string
  awardedYear?: number
}

export interface Restaurant {
  id: string
  name: string
  category: string
  /** 대표 키워드 태그 (카드/상세에서 #태그 형태로 노출) */
  keywords: string[]
  /** 한 줄 설명 */
  tagline: string
  /** "이 곳을 가야 하는 이유" */
  reason: string
  addressRoad: string
  lat: number
  lng: number
  verifications: Verification[]
}

/** 인증 유형별 표시 메타데이터 (라벨/이모지/브랜드 컬러) — 0001_init.sql 시드와 색상 일치 */
export const VERIFICATION_META: Record<
  VerificationCode,
  { label: string; emoji: string; color: string }
> = {
  michelin: { label: '미슐랭', emoji: '⭐', color: '#C4002B' },
  blue_ribbon: { label: '블루리본', emoji: '🎀', color: '#1E40AF' },
  centennial: { label: '백년가게', emoji: '🏅', color: '#047857' },
  celebrity: { label: '연예인 픽', emoji: '📺', color: '#7C3AED' },
}

/** 인증 신뢰도/노출 우선순위 (앞쪽이 높음) — 마커 색상·대표 인증 결정에 사용 */
export const VERIFICATION_PRIORITY: VerificationCode[] = [
  'michelin',
  'blue_ribbon',
  'centennial',
  'celebrity',
]

/** 한 식당의 대표(최상위) 인증 1건 — 마커 색상/대표 뱃지에 사용 */
export function primaryVerification(r: Restaurant): Verification | undefined {
  return [...r.verifications].sort(
    (a, b) =>
      VERIFICATION_PRIORITY.indexOf(a.code) - VERIFICATION_PRIORITY.indexOf(b.code),
  )[0]
}

export type FilterValue = 'all' | VerificationCode

export const FILTER_OPTIONS: { value: FilterValue; label: string; color: string }[] = [
  { value: 'all', label: '전체', color: '#111827' },
  { value: 'michelin', label: '미슐랭', color: VERIFICATION_META.michelin.color },
  { value: 'blue_ribbon', label: '블루리본', color: VERIFICATION_META.blue_ribbon.color },
  { value: 'centennial', label: '백년가게', color: VERIFICATION_META.centennial.color },
  { value: 'celebrity', label: '연예인 픽', color: VERIFICATION_META.celebrity.color },
]

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'r1',
    name: '더 테이블 청담',
    category: '파인다이닝',
    keywords: ['코스요리', '기념일', '예약필수'],
    tagline: '제철 식재료로 완성하는 미슐랭 2스타 다이닝',
    reason: '기념일에 실패 없는 선택. 예약은 어렵지만 코스 구성이 그만한 값을 합니다.',
    addressRoad: '서울 강남구 도산대로 99길 12',
    lat: 37.5256,
    lng: 127.0411,
    verifications: [
      { code: 'michelin', rating: 2, awardedYear: 2024 },
      { code: 'blue_ribbon', rating: 3, awardedYear: 2024 },
    ],
  },
  {
    id: 'r2',
    name: '할매손칼국수',
    category: '한식',
    keywords: ['손칼국수', '노포', '가성비'],
    tagline: '40년 한자리, 멸치육수 손칼국수 노포',
    reason: '백년가게로 검증된 변치 않는 손맛. 점심 웨이팅은 회전이 빨라 금방 빠집니다.',
    addressRoad: '서울 중구 필동로 5',
    lat: 37.5598,
    lng: 126.9942,
    verifications: [{ code: 'centennial', awardedYear: 2018 }],
  },
  {
    id: 'r3',
    name: '광화문 옛집',
    category: '한식',
    keywords: ['도가니탕', '해장', '직장인맛집'],
    tagline: '광화문 직장인의 30년 단골 곰탕집',
    reason: '방송에도 소개된 진한 국물. 해장과 보양을 한 그릇에 해결할 수 있습니다.',
    addressRoad: '서울 종로구 새문안로 17',
    lat: 37.5701,
    lng: 126.9759,
    verifications: [
      { code: 'blue_ribbon', rating: 1, awardedYear: 2023 },
      { code: 'celebrity', recommender: '예능 <맛집원정대> 방영' },
    ],
  },
  {
    id: 'r4',
    name: '을지로 골목집',
    category: '노포/호프',
    keywords: ['노가리', '생맥주', '을지로'],
    tagline: '을지로 노가리 골목의 터줏대감',
    reason: '퇴근 후 가볍게 한잔하기 좋은 가성비. 골목 분위기 자체가 안주가 됩니다.',
    addressRoad: '서울 중구 을지로 13길 5',
    lat: 37.5664,
    lng: 126.991,
    verifications: [
      { code: 'centennial', awardedYear: 2019 },
      { code: 'celebrity', recommender: '인기 먹방 유튜버 추천' },
    ],
  },
  {
    id: 'r5',
    name: '연남 베이커리 클럽',
    category: '카페/디저트',
    keywords: ['소금빵', '연남동', '디저트'],
    tagline: '연남동 골목 안 스페셜티 베이커리 카페',
    reason: '소금빵이 1시간마다 새로 나옵니다. 인스타 감성과 실제 맛을 둘 다 잡은 곳.',
    addressRoad: '서울 마포구 연남로 1길 30',
    lat: 37.5631,
    lng: 126.9248,
    verifications: [{ code: 'celebrity', recommender: '셀럽 인스타 추천' }],
  },
]
