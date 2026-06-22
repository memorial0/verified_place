// =============================================================================
// 외국인 관광객용 어메니티 — 단일 출처 (Single Source of Truth)
// =============================================================================
// 인증(VerificationCode)과는 다른 축이다. 인증은 "누가 검증했나"(택1 대표),
// 어메니티는 "외국인이 편하게 갈 수 있나"(여러 개 동시 보유, AND 필터).
//
// 데이터: restaurants.amenities jsonb (0012 마이그레이션). business_hours 와
//   동일한 "느슨한 JSONB + admin 점진 보강" 패턴. 키가 없거나 false 면 미보유.
//
// 라벨: 기본 타깃은 영어(en). ko 는 운영/관리자 화면용 폴백.

import type { Locale } from '@/lib/i18n/display'

/** 어메니티 키 — DB amenities jsonb 의 키와 1:1. snake_case 유지. */
export type AmenityKey =
  | 'english_menu'
  | 'english_support'
  | 'overseas_card'
  | 'halal_friendly'
  | 'vegetarian'
  | 'group_friendly'

/** 어메니티 키 전체 (DB 저장/검증·폼 순회용 단일 출처). 외국인 방문객 우선순위 순. */
export const AMENITY_KEYS: AmenityKey[] = [
  'english_menu',
  'english_support',
  'overseas_card',
  'vegetarian',
  'group_friendly',
  'halal_friendly',
]

/** 한 식당의 어메니티 보유 여부. 전부 optional — 없으면 '정보 없음'(미보유로 취급). */
export type Amenities = Partial<Record<AmenityKey, boolean>>

interface AmenityMeta {
  key: AmenityKey
  icon: string
  /** 로케일별 라벨 (en 기본) */
  label: Record<Locale, string>
  /**
   * 안전 주의 문구(로케일별). 실제 인증이 없는 항목(예: 할랄)에 "재료 확인 필요"
   * 같은 안전한 표현을 덧붙인다. 있으면 필터 칩/배지에 title 로 노출.
   */
  note?: Record<Locale, string>
}

/**
 * 노출/필터 순서 = 외국인 방문객 체감 중요도 순(영어 메뉴/응대 → 결제 → 식이 → 단체 → 무슬림).
 * 신규 어메니티 추가는 이 배열에 항목만 늘리면 필터/배지가 자동 확장된다.
 *
 * ⚠️ halal_friendly: 실제 할랄 인증이 아니므로 "Halal certified" 가 아닌
 *    "Muslim-friendly"(+ 재료 확인 안내)로 표현한다. DB 키는 halal_friendly 유지.
 */
export const AMENITY_OPTIONS: AmenityMeta[] = [
  { key: 'english_menu',    icon: '🇬🇧', label: { en: 'English menu',     ko: '영어 메뉴',      ja: '英語メニュー',   zh: '英文菜单' } },
  { key: 'english_support', icon: '🗣️', label: { en: 'English support',  ko: '영어 응대 가능', ja: '英語対応',      zh: '英语服务' } },
  { key: 'overseas_card',   icon: '💳', label: { en: 'Overseas cards OK', ko: '해외카드 결제',  ja: '海外カード可',   zh: '海外卡支付' } },
  { key: 'vegetarian',      icon: '🥗', label: { en: 'Vegetarian options', ko: '채식 메뉴',     ja: 'ベジタリアン',   zh: '素食选择' } },
  { key: 'group_friendly',  icon: '👥', label: { en: 'Group-friendly',    ko: '단체 가능',     ja: '団体対応',      zh: '团体友好' } },
  {
    key: 'halal_friendly',
    icon: '☪️',
    label: { en: 'Muslim-friendly', ko: '무슬림 친화', ja: 'ムスリム対応', zh: '清真友好' },
    note: {
      en: 'Muslim-friendly — please confirm ingredients',
      ko: '무슬림 친화 — 재료 확인이 필요합니다',
      ja: 'ムスリム対応 — 食材をご確認ください',
      zh: '清真友好 — 请确认食材',
    },
  },
]

const META_BY_KEY: Record<AmenityKey, AmenityMeta> = Object.fromEntries(
  AMENITY_OPTIONS.map((o) => [o.key, o]),
) as Record<AmenityKey, AmenityMeta>

/** 어메니티 메타 1건 조회. */
export function getAmenityMeta(key: AmenityKey): AmenityMeta {
  return META_BY_KEY[key]
}

/** 로케일별 라벨. 누락 로케일은 en 으로 폴백. */
export function amenityLabel(key: AmenityKey, locale: Locale = 'en'): string {
  const m = META_BY_KEY[key]
  return m.label[locale] ?? m.label.en
}

/** 로케일별 안전 주의 문구(없으면 null). 예: 할랄 "재료 확인 필요". */
export function amenityNote(key: AmenityKey, locale: Locale = 'en'): string | null {
  const m = META_BY_KEY[key]
  return m.note ? (m.note[locale] ?? m.note.en) : null
}

/** 보유한 어메니티 키만 노출 순서대로 추출. */
export function activeAmenities(amenities?: Amenities): AmenityKey[] {
  if (!amenities) return []
  return AMENITY_OPTIONS.filter((o) => amenities[o.key]).map((o) => o.key)
}

/** 식당이 선택된 어메니티를 "전부"(AND) 보유하는지. 선택 없으면 통과. */
export function matchesAmenities(amenities: Amenities | undefined, selected: AmenityKey[]): boolean {
  if (selected.length === 0) return true
  if (!amenities) return false
  return selected.every((k) => amenities[k] === true)
}
