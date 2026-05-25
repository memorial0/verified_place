// =============================================================================
// 미쉐린 가이드 서울 2025 — 큐레이션 데이터 (별점집 우선)
//
// 검증 사실(이름·별등급·연도)은 미쉐린 가이드 서울&부산 2025 공식 발표 기준.
// 좌표/도로명 주소는 보유하지 않음 → 카카오 Local(키워드) 검색으로 해석(geocode)한다.
//   (미쉐린 사이트는 스크래핑을 차단하므로 주소를 직접 긁지 않는다)
//
// ⚠️ 한글 표기/검색어는 사용자 최종 확인 필요. 1스타 27곳은 검증 후 순차 추가 예정.
// 출처: guide.michelin.com (Seoul & Busan 2025), Korea Herald, Wikipedia
// =============================================================================

export interface MichelinEntry {
  nameKo: string
  nameEn: string
  stars: 1 | 2 | 3
  year: number
  /** 카카오 키워드 검색용 질의 (지오코딩 시 사용) */
  query: string
}

export const MICHELIN_SEOUL_2025: MichelinEntry[] = [
  // ⭐⭐⭐ 3-Star (1)
  { nameKo: '밍글스', nameEn: 'Mingles', stars: 3, year: 2025, query: '밍글스 청담' },

  // ⭐⭐ 2-Star (9)
  { nameKo: '정식당', nameEn: 'Jungsik', stars: 2, year: 2025, query: '정식당 청담' },
  { nameKo: '라연', nameEn: 'La Yeon', stars: 2, year: 2025, query: '라연 신라호텔' },
  { nameKo: '권숙수', nameEn: 'Kwonsooksoo', stars: 2, year: 2025, query: '권숙수 청담' },
  { nameKo: '코지마', nameEn: 'Kojima', stars: 2, year: 2025, query: '스시코지마' },
  { nameKo: '스와니예', nameEn: 'Soigné', stars: 2, year: 2025, query: '스와니예 서초' },
  { nameKo: '미토우', nameEn: 'Mitou', stars: 2, year: 2025, query: '미토우' },
  { nameKo: '알라 프리마', nameEn: 'Alla Prima', stars: 2, year: 2025, query: '알라프리마' },
  { nameKo: '에빗', nameEn: 'Evett', stars: 2, year: 2025, query: '에빗 청담' },
  { nameKo: '레스토랑 알렌', nameEn: 'Restaurant Allen', stars: 2, year: 2025, query: '레스토랑 알렌' },
]
