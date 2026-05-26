'use client'

import { useEffect, useState } from 'react'
import { type FilterValue, type Restaurant } from '@/lib/mock/restaurants'
import { useRestaurants } from '@/lib/hooks/useRestaurants'
import { useSavedRestaurants } from '@/lib/hooks/useSavedRestaurants'
import {
  fetchDirections,
  getCurrentPosition,
  type DirectionsResult,
  type LatLng,
} from '@/lib/api/directions'
import { FilterChips } from './FilterChips'
import { RestaurantSidebar } from './RestaurantSidebar'
import { RestaurantMap } from './RestaurantMap'

type ActiveRoute = DirectionsResult & { destId: string; origin: LatLng }

/**
 * 지도(70%) + 사이드바 목록/상세(30%) + 상단 필터를 묶는 클라이언트 컨테이너.
 *
 * 상태: filter / hoverId / selectedId / activeId(=hoverId??selectedId) / route(길찾기 경로)
 */
export function MapExplorer() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const { restaurants, state } = useRestaurants(filter)
  const { isSaved, toggle: toggleSave, savedCount } = useSavedRestaurants()

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = hoverId ?? selectedId

  const [route, setRoute] = useState<ActiveRoute | null>(null)
  const [dirLoading, setDirLoading] = useState(false)

  // 선택 식당이 목록에서 사라지면 선택·경로 해제
  useEffect(() => {
    if (selectedId && !restaurants.some((r) => r.id === selectedId)) {
      setSelectedId(null)
      setRoute(null)
    }
  }, [restaurants, selectedId])

  const handleSelect = (id: string | null) => {
    setHoverId(null)
    setSelectedId(id)
    setRoute(null) // 다른 식당으로 이동하면 그려진 경로 제거
  }

  // 현재 위치 → 식당 자동차 경로. 위치 거부/실패 시 네이버 지도로 폴백.
  const requestDirections = async (r: Restaurant) => {
    setDirLoading(true)
    try {
      const origin = await getCurrentPosition()
      const { path, summary } = await fetchDirections(origin, { lat: r.lat, lng: r.lng })
      setRoute({ destId: r.id, origin, path, summary })
    } catch {
      window.open(
        `https://map.naver.com/p/search/${encodeURIComponent(r.name)}`,
        '_blank',
        'noopener',
      )
    } finally {
      setDirLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="z-10 shrink-0 overflow-x-auto border-b border-gray-100 bg-white/80 px-4 py-2.5 backdrop-blur">
        <FilterChips
          active={filter}
          onChange={(v) => {
            setFilter(v)
            setHoverId(null)
          }}
          restaurants={restaurants}
        />
      </div>

      <div className="flex flex-1 flex-col-reverse overflow-hidden md:flex-row">
        <RestaurantSidebar
          restaurants={restaurants}
          activeId={activeId}
          selectedId={selectedId}
          state={state}
          savedCount={savedCount}
          isSaved={isSaved}
          dirLoading={dirLoading}
          routeSummary={route && route.destId === selectedId ? route.summary : null}
          onHover={setHoverId}
          onSelect={handleSelect}
          onToggleSave={toggleSave}
          onDirections={requestDirections}
        />
        <div className="relative flex-1">
          <RestaurantMap
            restaurants={restaurants}
            activeId={activeId}
            selectedId={selectedId}
            route={route}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  )
}
