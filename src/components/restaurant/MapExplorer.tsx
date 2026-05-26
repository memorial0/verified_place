'use client'

import { useEffect, useState } from 'react'
import { type FilterValue, type Restaurant } from '@/lib/mock/restaurants'
import { useRestaurants } from '@/lib/hooks/useRestaurants'
import { useSavedRestaurants } from '@/lib/hooks/useSavedRestaurants'
import { useCourse } from '@/lib/hooks/useCourse'
import {
  fetchDirections,
  getCurrentPosition,
  type DirectionsResult,
  type LatLng,
} from '@/lib/api/directions'
import { FilterChips } from './FilterChips'
import { RestaurantSidebar } from './RestaurantSidebar'
import { RestaurantMap } from './RestaurantMap'
import { RestaurantMiniSheet } from './RestaurantMiniSheet'

type ActiveRoute = DirectionsResult & { destId: string; origin: LatLng }

/**
 * 지도(70%) + 사이드바 목록/상세(30%) + 상단 필터를 묶는 클라이언트 컨테이너.
 *
 * 선택 흐름:
 *   마커 클릭   → previewId (지도 하단 미니 바텀시트, 빠른 행동 3개)
 *   "상세보기"  → selectedId (사이드바 상세 패널)
 *   사이드바 카드 클릭 → selectedId (상세 패널)
 *   hover       → hoverId (마커 강조 + 정보 팝업)
 */
export function MapExplorer() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const { restaurants, state } = useRestaurants(filter)
  const { isSaved, toggle: toggleSave, savedCount } = useSavedRestaurants()
  const { has: inCourse, toggle: toggleCourse, count: courseCount } = useCourse()

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = hoverId ?? previewId ?? selectedId

  const [route, setRoute] = useState<ActiveRoute | null>(null)
  const [dirLoading, setDirLoading] = useState(false)

  // 활성 식당이 목록에서 사라지면 관련 상태 해제
  useEffect(() => {
    const gone = (id: string | null) => id && !restaurants.some((r) => r.id === id)
    if (gone(selectedId)) {
      setSelectedId(null)
      setRoute(null)
    }
    if (gone(previewId)) setPreviewId(null)
  }, [restaurants, selectedId, previewId])

  // 마커 클릭 → 미니 바텀시트 미리보기
  const handlePreview = (id: string | null) => {
    setHoverId(null)
    setSelectedId(null)
    setPreviewId(id)
    setRoute(null)
  }

  // 미니시트 "상세보기" / 사이드바 카드 클릭 → 상세 패널
  const handleSelect = (id: string | null) => {
    setHoverId(null)
    setPreviewId(null)
    setSelectedId(id)
    setRoute(null)
  }

  // 빈 지도 클릭/팝업 닫기 → 전체 해제
  const handleClear = () => {
    setHoverId(null)
    setPreviewId(null)
    setSelectedId(null)
    setRoute(null)
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

  const previewRestaurant = previewId
    ? restaurants.find((r) => r.id === previewId) ?? null
    : null

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
          courseCount={courseCount}
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
            selectedId={previewId ?? selectedId}
            previewId={previewId}
            route={route}
            onPreview={handlePreview}
            onClear={handleClear}
          />

          {previewRestaurant && (
            <RestaurantMiniSheet
              restaurant={previewRestaurant}
              inCourse={inCourse(previewRestaurant.id)}
              dirLoading={dirLoading}
              onDirections={requestDirections}
              onDetail={handleSelect}
              onToggleCourse={toggleCourse}
              onClose={() => setPreviewId(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
