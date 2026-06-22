// =============================================================================
// UI 문자열 다국어 사전 (en/ja/zh/ko) — 핵심 버튼·안내 문구용.
// =============================================================================
// 식당 콘텐츠(이름/설명)는 lib/i18n/display 헬퍼가 담당. 여기는 "앱 셸" 문자열
// (헤더, 언어선택, 빠른버튼, 필터 섹션 라벨 등)만 모은다.
//
// 기본 타깃은 en. 누락 키는 en 으로 폴백. 추후 확장 시 이 사전에 키만 추가.

import type { Locale } from '@/lib/i18n/display'

export type UiKey =
  | 'appTitle'
  | 'appSubtitle'
  | 'chooseLanguage'
  | 'welcomeTagline'
  | 'enter'
  | 'forVisitors'
  | 'verifiedBy'
  | 'recommendedNote'
  | 'resultsNear'
  | 'clear'
  | 'halalNote'
  | 'quickEat'
  | 'quickVenue'
  | 'quickTeam'
  | 'quickVeg'
  | 'quickEnglish'
  | 'quickTour'
  | 'about'
  | 'places'
  | 'searchAll'
  | 'pilotOnly'

const UI: Record<Locale, Record<UiKey, string>> = {
  en: {
    appTitle: 'Food Guide for Visitors in Chuncheon',
    appSubtitle: 'Safe meals & easy routes for the 2026 World Taekwondo Poomsae Championships',
    chooseLanguage: 'Choose your language',
    welcomeTagline: 'Find safe food and easy routes during your stay in Chuncheon.',
    enter: 'Enter',
    forVisitors: 'For visitors',
    verifiedBy: 'Verified by',
    recommendedNote: 'Recommended spots near the venue',
    resultsNear: 'Showing places near the venue',
    clear: 'Clear',
    halalNote: 'Muslim-friendly — please confirm ingredients',
    quickEat: 'Find food I can eat',
    quickVenue: 'Near the venue',
    quickTeam: 'Team dinner',
    quickVeg: 'Vegetarian options',
    quickEnglish: 'English support',
    quickTour: 'Short tour course',
    about: 'About',
    places: 'Places',
    searchAll: 'Search all Chuncheon',
    pilotOnly: 'Show recommended only',
  },
  ja: {
    appTitle: '春川 訪問者向け 食事ガイド',
    appSubtitle: '2026 春川 世界テコンドープムセ選手権 来場者のための食事・ルート案内',
    chooseLanguage: '言語を選択',
    welcomeTagline: '春川で安心して食べられるお店と移動ルートを探せます。',
    enter: 'はじめる',
    forVisitors: '訪問者向け',
    verifiedBy: '認証',
    recommendedNote: '会場周辺のおすすめ',
    resultsNear: '会場周辺のお店を表示中',
    clear: 'クリア',
    halalNote: 'ムスリム対応 — 食材をご確認ください',
    quickEat: '食べられる店を探す',
    quickVenue: '会場周辺',
    quickTeam: 'チームディナー',
    quickVeg: 'ベジタリアン',
    quickEnglish: '英語対応',
    quickTour: '短時間コース',
    about: '紹介',
    places: '店舗',
    searchAll: '春川全体を検索',
    pilotOnly: 'おすすめのみ',
  },
  zh: {
    appTitle: '春川访客美食指南',
    appSubtitle: '2026 春川世界跆拳道品势锦标赛 访客餐饮与路线指南',
    chooseLanguage: '选择语言',
    welcomeTagline: '在春川找到适合您的餐厅和路线。',
    enter: '进入',
    forVisitors: '访客便利',
    verifiedBy: '认证',
    recommendedNote: '会场周边推荐',
    resultsNear: '正在显示会场附近的餐厅',
    clear: '清除',
    halalNote: '清真友好 — 请确认食材',
    quickEat: '寻找我能吃的餐厅',
    quickVenue: '会场附近',
    quickTeam: '团队聚餐',
    quickVeg: '素食选择',
    quickEnglish: '英语服务',
    quickTour: '短途路线',
    about: '介绍',
    places: '餐厅',
    searchAll: '搜索全部春川',
    pilotOnly: '只看推荐',
  },
  ko: {
    appTitle: '춘천 외국인 방문객 식사 안내',
    appSubtitle: '2026 춘천 세계태권도품새선수권대회 방문객을 위한 식사·동선 안내',
    chooseLanguage: '언어 선택',
    welcomeTagline: '춘천에서 외국인 방문객에게 맞는 식당과 동선을 찾아보세요.',
    enter: '시작하기',
    forVisitors: '외국인 편의',
    verifiedBy: '인증',
    recommendedNote: '대회장 인근 추천',
    resultsNear: '대회장 인근 식당 표시 중',
    clear: '초기화',
    halalNote: '무슬림 친화 — 재료 확인이 필요합니다',
    quickEat: '먹을 수 있는 음식 찾기',
    quickVenue: '대회장 근처',
    quickTeam: '단체 회식',
    quickVeg: '채식 메뉴',
    quickEnglish: '영어 가능',
    quickTour: '짧은 코스',
    about: '소개',
    places: '식당',
    searchAll: '춘천 전체 검색',
    pilotOnly: '추천만 보기',
  },
}

/** 로케일별 UI 문자열. 누락 시 en 으로 폴백. */
export function t(locale: Locale, key: UiKey): string {
  return UI[locale]?.[key] ?? UI.en[key] ?? key
}

/** 언어 선택 UI 옵션 — 표시 순서. name 은 해당 언어 자기표기(로케일 무관). */
export const LANGUAGE_OPTIONS: { locale: Locale; name: string; short: string }[] = [
  { locale: 'en', name: 'English', short: 'EN' },
  { locale: 'zh', name: '中文', short: '中' },
  { locale: 'ja', name: '日本語', short: '日' },
  { locale: 'ko', name: '한국어', short: '한' },
]
