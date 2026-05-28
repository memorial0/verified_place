import type { Restaurant } from '@/lib/mock/restaurants'

/** 지역 슬러그. 'all' = 필터 없음(전국). */
export type Region = 'all' | 'chuncheon' | 'seoul'

/**
 * 지역 칩 옵션. sido 는 DB restaurants.sido 컬럼과 1:1 매칭(필터 키).
 * 신규 지역 추가는 이 배열에 항목만 늘리면 컴포넌트 변경 없이 자동 확장된다.
 *
 * 메모: 더 좁은 단위(예: 강원도 vs 춘천시)가 필요하면 sigungu 필드를 옵션에
 *      추가하고 filterByRegion 에서 sigungu 우선 매칭하도록 확장.
 */
export const REGION_OPTIONS: { value: Region; label: string; sido?: string }[] = [
  { value: 'all',       label: '전국' },
  { value: 'chuncheon', label: '춘천', sido: '강원특별자치도' },
  { value: 'seoul',     label: '서울', sido: '서울특별시' },
]

/**
 * 지역 변경 시 지도 panTo 좌표. 'all' 은 사용자 시야를 유지(이동 안 함).
 * chuncheon 좌표는 RestaurantMap.DEFAULT_CENTER 와 동일 — 첫 마운트는 시각 변화 0.
 */
export const REGION_CENTERS: Record<Exclude<Region, 'all'>, { lat: number; lng: number }> = {
  chuncheon: { lat: 37.8813, lng: 127.7300 },
  seoul:     { lat: 37.5663, lng: 126.9779 },
}

/** Restaurant 리스트를 지역으로 필터링. 'all' 이면 그대로 반환. */
export function filterByRegion(items: Restaurant[], region: Region): Restaurant[] {
  if (region === 'all') return items
  const opt = REGION_OPTIONS.find((o) => o.value === region)
  if (!opt?.sido) return items
  return items.filter((r) => r.sido === opt.sido)
}
