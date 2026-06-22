// =============================================================================
// 카테고리/태그 라벨 다국어 맵 (en/ja/zh/ko)
// =============================================================================
// 식당명은 한국어 유지(번역 안 함). 그러나 카테고리·키워드 태그는 UI 성격이라
// 로케일에 맞춰 번역한다. DB 값(category.name_ko / keywords)이 한국어 단일이라
// 여기서 표시용으로 매핑. 매핑에 없는 값은 원문 그대로 폴백(억지 번역 금지).

import type { Locale } from '@/lib/i18n/display'

export const CATEGORY_LABEL: Record<string, Record<Locale, string>> = {
  // ── 카테고리(name_ko) ──
  '한식':        { en: 'Korean food',              ja: '韓国料理',     zh: '韩餐',     ko: '한식' },
  '일식':        { en: 'Japanese food',            ja: '日本料理',     zh: '日餐',     ko: '일식' },
  '중식':        { en: 'Chinese food',             ja: '中華料理',     zh: '中餐',     ko: '중식' },
  '양식':        { en: 'Western food',             ja: '洋食',         zh: '西餐',     ko: '양식' },
  '카페':        { en: 'Cafe',                     ja: 'カフェ',       zh: '咖啡馆',   ko: '카페' },
  '카페/디저트': { en: 'Cafe & dessert',           ja: 'カフェ・デザート', zh: '咖啡甜点', ko: '카페/디저트' },
  // ── 음식/태그 ──
  '닭갈비':      { en: 'Dak-galbi',                ja: 'タッカルビ',   zh: '铁板鸡',   ko: '닭갈비' },
  '막국수':      { en: 'Buckwheat noodles',        ja: 'マッククス',   zh: '荞麦面',   ko: '막국수' },
  '분식':        { en: 'Casual Korean snack food', ja: '韓国軽食',     zh: '韩式小吃', ko: '분식' },
  '닭요리':      { en: 'Chicken dishes',           ja: '鶏料理',       zh: '鸡肉料理', ko: '닭요리' },
  '뷔페식':      { en: 'Buffet',                   ja: 'ビュッフェ',   zh: '自助餐',   ko: '뷔페식' },
  '음식점':      { en: 'Restaurant',               ja: '飲食店',       zh: '餐厅',     ko: '음식점' },
  // ── 지역 태그(keywords 에 섞여 있음) ──
  '춘천시':      { en: 'Chuncheon',                ja: '春川市',       zh: '春川市',   ko: '춘천시' },
}

/** 카테고리/태그 라벨. 매핑에 없으면 원문 그대로(억지 번역 안 함). */
export function categoryLabel(value: string | undefined | null, locale: Locale): string {
  if (!value) return ''
  const m = CATEGORY_LABEL[value.trim()]
  return m ? (m[locale] ?? m.en) : value
}
