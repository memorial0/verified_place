// =============================================================================
// UI 문자열 다국어 사전 (en/ja/zh/ko) — 화면 문구 단일 출처.
// =============================================================================
// 식당 콘텐츠(이름)는 한국어 유지. 외국인용 설명은 visitor_note_en 등 별도 필드.
// 인증/카테고리 라벨은 lib/verifications 의 verificationLabel 사용.
//
// 기본 타깃은 en. 누락 키는 en 으로 폴백. 추후 확장 시 이 사전에 키만 추가.

import type { Locale } from '@/lib/i18n/display'

export type UiKey =
  // 헤더 / 언어 / 환영
  | 'appTitle'
  | 'appSubtitle'
  | 'chooseLanguage'
  | 'welcomeTagline'
  | 'enter'
  | 'about'
  // 필터 섹션 / 안내
  | 'forVisitors'
  | 'verifiedBy'
  | 'filterAll'
  | 'recommendedNote'
  | 'recommendedNearYou'
  | 'resultsNear'
  | 'clear'
  | 'halalNote'
  | 'places'
  | 'searchAll'
  | 'pilotOnly'
  // 빠른 선택
  | 'quickEat'
  | 'quickVenue'
  | 'quickTeam'
  | 'quickVeg'
  | 'quickEnglish'
  | 'quickTour'
  // 검색
  | 'searchPlaceholder'
  | 'noResults'
  // 리스트 / 코스 / 데이터 출처
  | 'myCourse'
  | 'sourceLoading'
  | 'sourceLive'
  | 'sourceDemo'
  // 상세 패널
  | 'back'
  | 'whyVisit'
  | 'goodForVisitors'
  | 'certifications'
  | 'contact'
  | 'address'
  | 'taxiHint'
  | 'hours'
  | 'hoursNone'
  | 'pleaseNote'
  | 'directions'
  | 'directionsLoading'
  | 'save'
  | 'saved'
  | 'taxi'
  | 'minUnit'
  | 'transitNote'
  // 미니 시트
  | 'close'
  | 'detailView'
  | 'addToCourse'
  | 'inCourse'
  | 'courseClearAll'
  | 'courseOrderHint'
  | 'courseEmpty'
  | 'courseEmptyHint'
  | 'moveUp'
  | 'moveDown'
  | 'removeFromCourse'
  | 'startPoint'
  | 'startFirst'
  | 'startMe'
  | 'optimizing'
  | 'optimizeOrder'
  | 'carBasis'
  | 'courseTotal'
  | 'toll'
  | 'fuel'
  | 'realtimeRoute'
  | 'startFellBack'
  | 'routeNotFound'
  | 'routeTempError'
  | 'waypointLimit'
  | 'courseRouteCta'
  | 'won'
  | 'metaCentennial'
  | 'metaGoodPrice'
  | 'metaExemplary'
  | 'signatureMenu'
  | 'seating'
  | 'accessibility'
  | 'wheelchairOk'
  | 'seatStanding'
  | 'seatFloor'
  | 'seatBoth'
  | 'focusCourse'
  | 'showAllMarkers'
  | 'start'
  | 'finish'
  | 'prev'
  | 'next'

const UI: Record<Locale, Record<UiKey, string>> = {
  en: {
    appTitle: 'Food Guide for Visitors in Chuncheon',
    appSubtitle: 'Safe meals & easy routes for the 2026 World Taekwondo Poomsae Championships',
    chooseLanguage: 'Choose your language',
    welcomeTagline: 'Find safe food and easy routes during your stay in Chuncheon.',
    enter: 'Enter',
    about: 'About',
    forVisitors: 'For visitors',
    verifiedBy: 'Verified by',
    filterAll: 'All',
    recommendedNote: 'Recommended places',
    recommendedNearYou: 'Recommended near you',
    resultsNear: 'Showing places near the venue',
    clear: 'Clear',
    halalNote: 'Muslim-friendly — please confirm ingredients',
    places: 'Places',
    searchAll: 'Search all Chuncheon',
    pilotOnly: 'Show recommended only',
    quickEat: 'Find food I can eat',
    quickVenue: 'Near the venue',
    quickTeam: 'Team dinner',
    quickVeg: 'Vegetarian options',
    quickEnglish: 'English support',
    quickTour: 'Short tour course',
    searchPlaceholder: 'Search restaurants, food, or area',
    noResults: 'No matching places found.',
    myCourse: 'My course',
    sourceLoading: 'Loading',
    sourceLive: '● Live',
    sourceDemo: '● Demo data',
    back: 'Back to list',
    whyVisit: 'Why visit',
    goodForVisitors: 'Good for visitors',
    certifications: 'Certifications',
    contact: 'Contact',
    address: 'Address',
    taxiHint: 'Show this address to your taxi driver',
    hours: 'Opening hours',
    hoursNone: 'No opening-hours info',
    pleaseNote: 'Please note',
    directions: 'Directions',
    directionsLoading: 'Finding route…',
    save: 'Save',
    saved: 'Saved',
    taxi: 'Taxi',
    minUnit: 'min',
    transitNote: 'Open transit & walking in Naver Map →',
    close: 'Close',
    detailView: 'Details',
    addToCourse: 'Add to course',
    inCourse: 'In course',
    courseClearAll: 'Clear all',
    courseOrderHint: 'Your saved order becomes the route. Use ↑↓ to reorder.',
    courseEmpty: 'Your course is empty.',
    courseEmptyHint: 'Tap a map marker and add it to your course.',
    moveUp: 'Move up',
    moveDown: 'Move down',
    removeFromCourse: 'Remove from course',
    startPoint: 'Start point',
    startFirst: 'First stop',
    startMe: 'My location',
    optimizing: 'Optimizing…',
    optimizeOrder: 'Sort by nearest',
    carBasis: 'By car',
    courseTotal: 'Total',
    toll: 'Toll',
    fuel: 'Fuel',
    realtimeRoute: 'Live optimized route',
    startFellBack: 'No location permission — using the first stop as the start.',
    routeNotFound: 'No route found. Stops may be too far apart.',
    routeTempError: 'Temporary error. Please try again later.',
    waypointLimit: 'Showing the route for the first {n} stops only (waypoint limit).',
    courseRouteCta: 'Route the whole course (by car)',
    won: 'KRW',
    metaCentennial: 'Their story',
    metaGoodPrice: 'Value menu',
    metaExemplary: 'Certified restaurant info',
    signatureMenu: 'Signature menu',
    seating: 'Seating',
    accessibility: 'Accessibility',
    wheelchairOk: '♿ Wheelchair accessible',
    seatStanding: 'Table seating',
    seatFloor: 'Floor seating',
    seatBoth: 'Table & floor seating',
    focusCourse: 'Course only',
    showAllMarkers: 'Show all',
    start: 'Start',
    finish: 'Finish',
    prev: 'Prev',
    next: 'Next',
  },
  ja: {
    appTitle: '春川 訪問者向け 食事ガイド',
    appSubtitle: '2026 春川 世界テコンドープムセ選手権 来場者のための食事・ルート案内',
    chooseLanguage: '言語を選択',
    welcomeTagline: '春川で安心して食べられるお店と移動ルートを探せます。',
    enter: 'はじめる',
    about: '紹介',
    forVisitors: '訪問者向け',
    verifiedBy: '認証',
    filterAll: 'すべて',
    recommendedNote: 'おすすめのお店',
    recommendedNearYou: 'あなたの近くのおすすめ',
    resultsNear: '会場周辺のお店を表示中',
    clear: 'クリア',
    halalNote: 'ムスリム対応の可能性あり・原材料をご確認ください',
    places: '店舗',
    searchAll: '春川全体を検索',
    pilotOnly: 'おすすめのみ',
    quickEat: '食べられる店を探す',
    quickVenue: '会場周辺',
    quickTeam: 'チームディナー',
    quickVeg: 'ベジタリアン',
    quickEnglish: '英語対応',
    quickTour: '短時間コース',
    searchPlaceholder: 'レストラン、料理、エリアを検索',
    noResults: '一致するお店が見つかりません。',
    myCourse: 'マイコース',
    sourceLoading: '読み込み中',
    sourceLive: '● ライブ',
    sourceDemo: '● デモデータ',
    back: 'リストに戻る',
    whyVisit: 'おすすめポイント',
    goodForVisitors: '訪問者に便利',
    certifications: '認証',
    contact: '連絡先',
    address: '住所',
    taxiHint: 'この住所をタクシー運転手にお見せください',
    hours: '営業時間',
    hoursNone: '営業時間情報なし',
    pleaseNote: 'ご注意ください',
    directions: '道順',
    directionsLoading: 'ルート検索中…',
    save: '保存',
    saved: '保存済み',
    taxi: 'タクシー',
    minUnit: '分',
    transitNote: '公共交通・徒歩はNaverマップで開く →',
    close: '閉じる',
    detailView: '詳細',
    addToCourse: 'コースに追加',
    inCourse: 'コース追加済み',
    courseClearAll: 'すべて削除',
    courseOrderHint: '追加した順が移動ルートになります。↑↓で並べ替え。',
    courseEmpty: 'コースは空です。',
    courseEmptyHint: '地図のマーカーをタップしてコースに追加。',
    moveUp: '上へ',
    moveDown: '下へ',
    removeFromCourse: 'コースから削除',
    startPoint: '出発地',
    startFirst: '最初の店',
    startMe: '現在地',
    optimizing: '計算中…',
    optimizeOrder: '近い順に並べ替え',
    carBasis: '車での目安',
    courseTotal: 'コース全体',
    toll: '通行料',
    fuel: '燃料費',
    realtimeRoute: 'リアルタイム最適ルート',
    startFellBack: '位置情報の許可がないため、最初の店を出発地にします。',
    routeNotFound: 'ルートが見つかりません。地点が離れすぎている可能性があります。',
    routeTempError: '一時的なエラーです。しばらくして再試行してください。',
    waypointLimit: '経由地の上限により、先頭{n}件のみルート表示します。',
    courseRouteCta: 'コース全体の道順（車）',
    won: 'ウォン',
    metaCentennial: '老舗ストーリー',
    metaGoodPrice: 'お手頃メニュー',
    metaExemplary: '優良店情報',
    signatureMenu: '看板メニュー',
    seating: '座席',
    accessibility: 'アクセス',
    wheelchairOk: '♿ 車椅子可',
    seatStanding: 'テーブル席',
    seatFloor: '座敷',
    seatBoth: 'テーブル・座敷両方',
    focusCourse: 'コースのみ',
    showAllMarkers: 'すべて表示',
    start: 'スタート',
    finish: 'ゴール',
    prev: '前へ',
    next: '次へ',
  },
  zh: {
    appTitle: '春川访客美食指南',
    appSubtitle: '2026 春川世界跆拳道品势锦标赛 访客餐饮与路线指南',
    chooseLanguage: '选择语言',
    welcomeTagline: '在春川找到适合您的餐厅和路线。',
    enter: '进入',
    about: '介绍',
    forVisitors: '访客便利',
    verifiedBy: '认证',
    filterAll: '全部',
    recommendedNote: '推荐餐厅',
    recommendedNearYou: '您附近的推荐',
    resultsNear: '正在显示会场附近的餐厅',
    clear: '清除',
    halalNote: '穆斯林友好 / 请确认食材',
    places: '餐厅',
    searchAll: '搜索全部春川',
    pilotOnly: '只看推荐',
    quickEat: '寻找我能吃的餐厅',
    quickVenue: '会场附近',
    quickTeam: '团队聚餐',
    quickVeg: '素食选择',
    quickEnglish: '英语服务',
    quickTour: '短途路线',
    searchPlaceholder: '搜索餐厅、食物或地区',
    noResults: '未找到匹配的餐厅。',
    myCourse: '我的路线',
    sourceLoading: '加载中',
    sourceLive: '● 实时',
    sourceDemo: '● 演示数据',
    back: '返回列表',
    whyVisit: '推荐理由',
    goodForVisitors: '访客便利',
    certifications: '认证',
    contact: '联系方式',
    address: '地址',
    taxiHint: '请将此地址出示给出租车司机',
    hours: '营业时间',
    hoursNone: '暂无营业时间',
    pleaseNote: '请注意',
    directions: '路线',
    directionsLoading: '正在查找路线…',
    save: '收藏',
    saved: '已收藏',
    taxi: '出租车',
    minUnit: '分钟',
    transitNote: '在Naver地图查看公交·步行 →',
    close: '关闭',
    detailView: '详情',
    addToCourse: '加入路线',
    inCourse: '已加入',
    courseClearAll: '清空',
    courseOrderHint: '添加顺序即为路线。用 ↑↓ 调整顺序。',
    courseEmpty: '路线为空。',
    courseEmptyHint: '点击地图标记加入路线。',
    moveUp: '上移',
    moveDown: '下移',
    removeFromCourse: '从路线移除',
    startPoint: '出发点',
    startFirst: '第一站',
    startMe: '我的位置',
    optimizing: '计算中…',
    optimizeOrder: '按最近排序',
    carBasis: '驾车',
    courseTotal: '全程',
    toll: '过路费',
    fuel: '油费',
    realtimeRoute: '实时最优路线',
    startFellBack: '没有定位权限，已使用第一站作为出发点。',
    routeNotFound: '未找到路线。地点可能相距太远。',
    routeTempError: '临时错误，请稍后再试。',
    waypointLimit: '受经停点上限限制，仅显示前 {n} 站的路线。',
    courseRouteCta: '规划全程路线（驾车）',
    won: '韩元',
    metaCentennial: '老店故事',
    metaGoodPrice: '实惠菜单',
    metaExemplary: '优秀餐厅信息',
    signatureMenu: '招牌菜',
    seating: '座位',
    accessibility: '无障碍',
    wheelchairOk: '♿ 可轮椅通行',
    seatStanding: '桌椅',
    seatFloor: '地坐',
    seatBoth: '桌椅与地坐',
    focusCourse: '仅看路线',
    showAllMarkers: '显示全部',
    start: '出发',
    finish: '终点',
    prev: '上一页',
    next: '下一页',
  },
  ko: {
    appTitle: '춘천 외국인 방문객 식사 안내',
    appSubtitle: '2026 춘천 세계태권도품새선수권대회 방문객을 위한 식사·동선 안내',
    chooseLanguage: '언어 선택',
    welcomeTagline: '춘천에서 외국인 방문객에게 맞는 식당과 동선을 찾아보세요.',
    enter: '시작하기',
    about: '소개',
    forVisitors: '외국인 편의',
    verifiedBy: '인증',
    filterAll: '전체',
    recommendedNote: '추천 식당',
    recommendedNearYou: '내 주변 추천',
    resultsNear: '대회장 인근 식당 표시 중',
    clear: '초기화',
    halalNote: '무슬림 친화 / 재료 확인 필요',
    places: '식당',
    searchAll: '춘천 전체 검색',
    pilotOnly: '추천만 보기',
    quickEat: '먹을 수 있는 음식 찾기',
    quickVenue: '대회장 근처',
    quickTeam: '단체 회식',
    quickVeg: '채식 메뉴',
    quickEnglish: '영어 가능',
    quickTour: '짧은 코스',
    searchPlaceholder: '식당, 음식, 지역 검색',
    noResults: '일치하는 식당이 없습니다.',
    myCourse: '내 코스',
    sourceLoading: '불러오는 중',
    sourceLive: '● 실시간',
    sourceDemo: '● 데모 데이터',
    back: '목록으로',
    whyVisit: '이 곳을 가야 하는 이유',
    goodForVisitors: '외국인 편의',
    certifications: '인증',
    contact: '연락처',
    address: '주소',
    taxiHint: '택시 기사에게 이 주소를 보여주세요',
    hours: '영업시간',
    hoursNone: '영업시간 정보 없음',
    pleaseNote: '주의',
    directions: '길찾기',
    directionsLoading: '경로 찾는 중…',
    save: '저장하기',
    saved: '저장됨',
    taxi: '택시',
    minUnit: '분',
    transitNote: '대중교통·도보는 네이버 지도에서 열기 →',
    close: '닫기',
    detailView: '상세보기',
    addToCourse: '코스에 추가',
    inCourse: '코스에 담김',
    courseClearAll: '전체 비우기',
    courseOrderHint: '담은 순서가 동선이 됩니다. ↑↓로 순서를 바꿔보세요.',
    courseEmpty: '코스가 비어 있습니다.',
    courseEmptyHint: '지도 마커를 눌러 코스에 추가해 보세요.',
    moveUp: '위로',
    moveDown: '아래로',
    removeFromCourse: '코스에서 삭제',
    startPoint: '출발점',
    startFirst: '코스 첫 집',
    startMe: '내 위치',
    optimizing: '순서 계산 중…',
    optimizeOrder: '가까운 순서로 정렬',
    carBasis: '자동차 기준',
    courseTotal: '코스 전체',
    toll: '통행료',
    fuel: '유류비',
    realtimeRoute: '실시간 최적 경로',
    startFellBack: '위치 권한이 없어 첫 집을 출발점으로 사용합니다.',
    routeNotFound: '경로를 찾지 못했습니다. 지점이 너무 멀거나 도로가 없을 수 있어요.',
    routeTempError: '일시적인 오류로 길찾기에 실패했어요. 잠시 후 다시 시도해 주세요.',
    waypointLimit: '경유지 한도로 앞 {n}곳까지만 경로를 표시합니다.',
    courseRouteCta: '코스 전체 길찾기 (자동차)',
    won: '원',
    metaCentennial: '백년가게 이야기',
    metaGoodPrice: '착한가격 대표메뉴',
    metaExemplary: '모범음식점 정보',
    signatureMenu: '대표메뉴',
    seating: '좌석',
    accessibility: '접근성',
    wheelchairOk: '♿ 휠체어 접근 가능',
    seatStanding: '입식',
    seatFloor: '좌식',
    seatBoth: '입식·좌식 모두 가능',
    focusCourse: '코스만 보기',
    showAllMarkers: '전체 보기',
    start: '출발',
    finish: '도착',
    prev: '이전',
    next: '다음',
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
