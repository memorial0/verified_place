import type { Restaurant } from '@/lib/mock/restaurants'

/**
 * 지원 로케일. ko 는 기본 슬롯(restaurant.name/tagline/reason)에 저장된다.
 * en/ja/zh 는 0006_restaurant_i18n 의 보조 컬럼에 저장되고, 비어 있으면 ko 로 폴백한다.
 */
export type Locale = 'ko' | 'en' | 'ja' | 'zh'

/**
 * 다국어 폴백 헬퍼.
 *   displayName(r, 'en') = r.nameEn ?? r.name
 * locale 이 ko 또는 미지원이면 ko 슬롯을 그대로 돌려준다.
 *
 * ⚠️ 외부 검색 URL(네이버 지도 등)에는 사용하지 말 것 — 한국어 상호로 검색해야 정확하다.
 *    그 경우엔 restaurant.name 을 직접 쓴다.
 */
export function displayName(r: Restaurant, locale: Locale = 'ko'): string {
  if (locale === 'en') return r.nameEn ?? r.name
  if (locale === 'ja') return r.nameJa ?? r.name
  if (locale === 'zh') return r.nameZh ?? r.name
  return r.name
}

export function displayTagline(r: Restaurant, locale: Locale = 'ko'): string {
  if (locale === 'en') return r.taglineEn ?? r.tagline
  if (locale === 'ja') return r.taglineJa ?? r.tagline
  if (locale === 'zh') return r.taglineZh ?? r.tagline
  return r.tagline
}

export function displayReason(r: Restaurant, locale: Locale = 'ko'): string {
  if (locale === 'en') return r.reasonEn ?? r.reason
  if (locale === 'ja') return r.reasonJa ?? r.reason
  if (locale === 'zh') return r.reasonZh ?? r.reason
  return r.reason
}
