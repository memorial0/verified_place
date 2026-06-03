// =============================================================================
// 인증(verification) 유형 메타데이터 — 표시 + 설명의 단일 출처.
//
// label/emoji/color 는 화면 배지에, authority/shortDesc/longDesc/sourceUrl 은
// About 페이지(/about)와 배지 설명(title 호버 + /about#<code> 링크)에 쓰인다.
// 식당별 데이터가 아니라 인증 "제도"에 대한 정적 편집 카피라 DB 가 아닌 코드에 둔다.
//
// 색상은 0001_init.sql 의 verification_types.badge_color 시드와 일치시킨다.
// (기존 src/lib/mock/restaurants.ts 의 VERIFICATION_META 를 이 파일로 추출 — 표시
//  컴포넌트/About 모두 여기서 import 한다. 컴포넌트 연결은 후속 단계에서.)
// =============================================================================

/** DDL 의 verification_types.code 와 동일한 코드 체계 */
export type VerificationCode =
  | 'michelin'
  | 'blue_ribbon'
  | 'centennial'
  | 'exemplary'
  | 'good_price'
  | 'celebrity'

export interface VerificationMeta {
  /** 배지/필터에 쓰는 짧은 한글 라벨 */
  label: string
  /** 배지 이모지 (미슐랭/블루리본은 rating 수만큼 반복) */
  emoji: string
  /** 브랜드 컬러 (hex) — 0001 시드 badge_color 와 일치 */
  color: string
  /** 발급/인증 기관 */
  authority: string
  /** 한 줄 설명 — 배지 title 호버 등 좁은 자리에 */
  shortDesc: string
  /** 2~3문장 설명 — About "인증 종류" 카드에 */
  longDesc: string
  /** 공식 출처 URL. 공신력 있는 출처가 없으면 null (예: 연예인 픽) */
  sourceUrl: string | null
}

/**
 * 인증 유형별 메타데이터.
 * ⚠️ 컴포넌트에서 VERIFICATION_META[code] 직접 인덱싱 금지 — 배포보다 앞서 새 인증이
 *    DB 에 시드되면 undefined 가 되어 터진다. 반드시 getVerificationMeta() 사용.
 */
export const VERIFICATION_META: Record<VerificationCode, VerificationMeta> = {
  michelin: {
    label: '미슐랭',
    emoji: '⭐',
    color: '#C4002B',
    authority: '미쉐린 가이드',
    shortDesc: '세계적 권위의 「미쉐린 가이드」가 별을 부여한 레스토랑.',
    longDesc:
      '1900년 프랑스에서 시작된 미쉐린 가이드는 익명 평가원이 재료·조리 기술·일관성 등을 기준으로 별을 매기는 세계적 권위의 레스토랑 평가서입니다. 별 1~3개로 등급을 나누며, 한국에서는 서울·부산 등을 대상으로 매년 발표됩니다. 배지의 별 개수가 받은 미쉐린 스타 수입니다.',
    sourceUrl: 'https://guide.michelin.com/kr/ko',
  },
  blue_ribbon: {
    label: '블루리본',
    emoji: '🎀',
    color: '#1E40AF',
    authority: '블루리본 서베이',
    shortDesc: '국내 미식 가이드 「블루리본 서베이」가 추천한 맛집.',
    longDesc:
      '블루리본 서베이는 2005년 시작된 한국의 대표 맛집 평가 가이드로, 독자와 전문가 평가를 종합해 리본을 부여합니다. 매년 「서울편」과 「전국편」으로 발간되며, 리본 1~3개로 등급을 매기고 리본 3개가 최고 등급입니다. 배지의 리본 개수가 등급을 뜻합니다.',
    sourceUrl: 'https://www.bluer.co.kr',
  },
  centennial: {
    label: '백년가게',
    emoji: '🏅',
    color: '#047857',
    authority: '중소벤처기업부 · 소상공인시장진흥공단',
    shortDesc: '30년 이상 명맥을 이어온 점포를 정부가 선정한 「백년가게」.',
    longDesc:
      '업력 30년 이상, 우수성과 성장 가능성을 갖춘 점포를 중소벤처기업부와 소상공인시장진흥공단이 선정·지원하는 제도입니다. 오래된 노포의 가치를 보존하고 100년 이상 이어지도록 돕는 것을 목표로 합니다.',
    sourceUrl: 'https://www.sbiz.or.kr/hdst/main/mainPage.do',
  },
  exemplary: {
    label: '모범음식점',
    emoji: '✅',
    color: '#0E7490',
    authority: '식품의약품안전처 · 지방자치단체',
    shortDesc: '위생·시설·서비스 기준을 충족해 지정된 「모범음식점」.',
    longDesc:
      '모범음식점은 식품위생법에 따라 위생 상태, 시설, 서비스 등이 우수한 일반음식점을 지방자치단체가 지정하는 제도입니다. 식품의약품안전처의 기준 아래 매년 적합 여부를 재심사하며, 지정 업소에는 모범음식점 표지판이 부여됩니다.',
    sourceUrl: 'https://www.mfds.go.kr/',
  },
  good_price: {
    label: '착한가격업소',
    emoji: '💰',
    color: '#EA580C',
    authority: '행정안전부',
    shortDesc: '합리적 가격과 위생을 갖춰 정부가 지정한 「착한가격업소」.',
    longDesc:
      '착한가격업소는 행정안전부와 지방자치단체가 저렴하고 합리적인 가격, 청결한 위생, 좋은 서비스를 갖춘 업소를 지정하는 제도입니다. 지역 물가 안정에 기여하는 곳을 선정·지원하며, 지정 업소 목록은 공공데이터로 공개됩니다.',
    sourceUrl: 'https://goodprice.go.kr',
  },
  celebrity: {
    label: '연예인 픽',
    emoji: '📺',
    color: '#7C3AED',
    authority: '인물 추천',
    shortDesc: '방송·SNS·인터뷰 등에서 유명인이나 분야 전문가가 추천한 식당.',
    longDesc:
      '방송·SNS·인터뷰 등 미디어에서 유명인이나 분야 전문가가 추천하거나 즐겨 찾는다고 밝힌 식당입니다. 기관 인증과는 성격이 다른 큐레이션 정보이므로 다른 배지와 구분해 표시하며, 누가 추천했는지는 식당 상세에서 인물명을 함께 보여줍니다.',
    sourceUrl: null,
  },
}

/** About "인증 종류" 등에서 일관된 노출 순서 (신뢰도/권위 순) */
export const VERIFICATION_ORDER: VerificationCode[] = [
  'michelin',
  'blue_ribbon',
  'centennial',
  'exemplary',
  'good_price',
  'celebrity',
]

// ── graceful 폴백 ────────────────────────────────────────────────────────────
// 배포보다 앞서 새 verification_type 이 DB 에 시드돼도(과거 0007/0008 모범음식점 사례)
// 컴포넌트가 터지지 않도록, 항상 getVerificationMeta() 로 접근한다.
const FALLBACK_META: VerificationMeta = {
  label: '인증',
  emoji: '📍',
  color: '#6B7280',
  authority: '',
  shortDesc: '',
  longDesc: '',
  sourceUrl: null,
}

export function getVerificationMeta(code: string): VerificationMeta {
  return (VERIFICATION_META as Record<string, VerificationMeta>)[code] ?? FALLBACK_META
}
