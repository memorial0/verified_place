// =============================================================================
// 외국인 대회 방문객용 메타 — 추천 상황(recommended_situation) / 지역대(venue_area)
// =============================================================================
// visitor_ready 식당에 붙는 분류값. DB 컬럼(text, 0013)과 1:1. 느슨한 text 라
// 값 검증은 앱/seed 레이어에서. 라벨은 표시용(en 기본 + ja/zh/ko).

import type { Locale } from '@/lib/i18n/display'

/** 추천 상황 — 어떤 상황에 가기 좋은가. */
export type RecommendedSituation =
  | 'before_match'
  | 'after_match'
  | 'team_dinner'
  | 'family'
  | 'cafe'
  | 'quick_meal'

/** 지역대 — 대회장/시내/역/호수/남춘천 등 위치 묶음. */
export type VenueArea =
  | 'near_venue'
  | 'downtown'
  | 'station'
  | 'lakeside'
  | 'south_chuncheon'

export const SITUATION_LABEL: Record<RecommendedSituation, Record<Locale, string>> = {
  before_match: { en: 'Before the match', ko: '경기 전', ja: '試合前', zh: '赛前' },
  after_match:  { en: 'After the match',  ko: '경기 후', ja: '試合後', zh: '赛后' },
  team_dinner:  { en: 'Team dinner',      ko: '단체 회식', ja: 'チームディナー', zh: '团队聚餐' },
  family:       { en: 'Family',           ko: '가족',   ja: '家族',   zh: '家庭' },
  cafe:         { en: 'Cafe',             ko: '카페',   ja: 'カフェ', zh: '咖啡' },
  quick_meal:   { en: 'Quick meal',       ko: '간단한 식사', ja: '軽食', zh: '简餐' },
}

export const VENUE_AREA_LABEL: Record<VenueArea, Record<Locale, string>> = {
  near_venue:      { en: 'Near the venue', ko: '대회장 인근', ja: '会場周辺', zh: '会场附近' },
  downtown:        { en: 'Downtown',       ko: '시내',     ja: '中心街',   zh: '市中心' },
  station:         { en: 'Station area',   ko: '역세권',   ja: '駅周辺',   zh: '车站附近' },
  lakeside:        { en: 'Lakeside',       ko: '호수 인근', ja: '湖畔',     zh: '湖边' },
  south_chuncheon: { en: 'South Chuncheon', ko: '남춘천',  ja: '南春川',   zh: '南春川' },
}

export function situationLabel(v: string | undefined, locale: Locale): string | null {
  if (!v) return null
  const m = SITUATION_LABEL[v as RecommendedSituation]
  return m ? (m[locale] ?? m.en) : null
}

export function venueAreaLabel(v: string | undefined, locale: Locale): string | null {
  if (!v) return null
  const m = VENUE_AREA_LABEL[v as VenueArea]
  return m ? (m[locale] ?? m.en) : null
}
