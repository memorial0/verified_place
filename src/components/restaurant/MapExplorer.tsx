'use client'

import { useEffect, useRef, useState } from 'react'
import { type FilterValue, type Restaurant } from '@/lib/mock/restaurants'
import { useRestaurants } from '@/lib/hooks/useRestaurants'
import { useSavedRestaurants } from '@/lib/hooks/useSavedRestaurants'
import { useCourse } from '@/lib/hooks/useCourse'
import {
  fetchDirections,
  fetchRouteThrough,
  getCurrentPosition,
  type DirectionsResult,
  type LatLng,
} from '@/lib/api/directions'
import { FilterChips } from './FilterChips'
import { RestaurantSidebar } from './RestaurantSidebar'
import { RestaurantMap } from './RestaurantMap'
import { RestaurantMiniSheet } from './RestaurantMiniSheet'

// destId: 단일 식당 경로면 그 id, 코스 전체 경로면 null
type ActiveRoute = DirectionsResult & { destId: string | null; origin: LatLng }

/** 네이버 경유지 한도(5) → 출발+경유5+도착 = 총 7지점 */
const MAX_COURSE_POINTS = 7

/**
 * 지도(70%) + 사이드바 목록/상세/코스(30%) + 상단 필터를 묶는 클라이언트 컨테이너.
 *
 * 선택 흐름:
 *   마커 클릭   → previewId (지도 하단 미니 바텀시트, 빠른 행동 3개)
 *   "상세보기"  → selectedId (사이드바 상세 패널)
 *   사이드바 카드 클릭 → selectedId (상세 패널)
 *   🧭 배지 클릭 → showCourse (사이드바 내 코스 패널)
 *   hover       → hoverId (마커 강조 + 정보 팝업)
 */
export function MapExplorer() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const { restaurants, state } = useRestaurants(filter)
  const { isSaved, toggle: toggleSave, savedCount } = useSavedRestaurants()
  const course = useCourse()

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCourse, setShowCourse] = useState(false)
  const activeId = hoverId ?? previewId ?? selectedId

  const [route, setRoute] = useState<ActiveRoute | null>(null)
  const [dirLoading, setDirLoading] = useState(false)
  const [courseRouting, setCourseRouting] = useState(false)
  const [courseRouteError, setCourseRouteError] = useState(false)

  // 필터로 목록이 줄어도 코스/저장 항목을 해석할 수 있도록, 본 적 있는 식당을 누적 보관
  const lookupRef = useRef<Map<string, Restaurant>>(new Map())
  for (const r of restaurants) lookupRef.current.set(r.id, r)
  const courseItems = course.items
    .map((id) => lookupRef.current.get(id))
    .filter((r): r is Restaurant => Boolean(r))

  // 활성 식당이 목록에서 사라지면 관련 상태 해제
  useEffect(() => {
    const gone = (id: string | null) => id && !restaurants.some((r) => r.id === id)
    if (gone(selectedId)) {
      setSelectedId(null)
      setRoute(null)
    }
    if (gone(previewId)) setPreviewId(null)
  }, [restaurants, selectedId, previewId])

  // 코스 구성/순서가 바뀌면 그려둔 코스 경로는 낡으므로 해제 (단일 식당 경로는 유지)
  useEffect(() => {
    setCourseRouteError(false)
    setRoute((r) => (r && r.destId === null ? null : r))
  }, [course.items])

  // 마커 클릭 → 미니 바텀시트 미리보기
  const handlePreview = (id: string | null) => {
    setHoverId(null)
    setSelectedId(null)
    setPreviewId(id)
    setRoute(null)
  }

  // 미니시트 "상세보기" / 사이드바 카드·코스 항목 클릭 → 상세 패널
  const handleSelect = (id: string | null) => {
    setHoverId(null)
    setPreviewId(null)
    setSelectedId(id)
    setRoute(null)
  }

  // 빈 지도 클릭/팝업 닫기 → 미리보기·선택 해제 (코스 패널은 유지)
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

  // 코스 전체를 순서대로 잇는 경로 (출발=첫 식당, 도착=마지막, 중간=경유지)
  const requestCourseDirections = async () => {
    const pts = courseItems.slice(0, MAX_COURSE_POINTS).map((r) => ({
      lat: r.lat,
      lng: r.lng,
    }))
    if (pts.length < 2) return
    setCourseRouting(true)
    setCourseRouteError(false)
    try {
      const { path, summary } = await fetchRouteThrough(pts)
      setRoute({ destId: null, origin: pts[0], path, summary })
    } catch {
      setCourseRouteError(true)
      setRoute(null)
    } finally {
      setCourseRouting(false)
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
          course={{
            count: course.count,
            show: showCourse,
            items: courseItems,
            open: () => setShowCourse(true),
            close: () => setShowCourse(false),
            move: course.move,
            remove: course.remove,
            clear: course.clear,
            routing: courseRouting,
            routeSummary: route && route.destId === null ? route.summary : null,
            routeError: courseRouteError,
            onRoute: requestCourseDirections,
          }}
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
            previewId={previewId}
            route={route}
            onPreview={handlePreview}
            onClear={handleClear}
          />

          {previewRestaurant && (
            <RestaurantMiniSheet
              restaurant={previewRestaurant}
              inCourse={course.has(previewRestaurant.id)}
              dirLoading={dirLoading}
              onDirections={requestDirections}
              onDetail={handleSelect}
              onToggleCourse={course.toggle}
              onClose={() => setPreviewId(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
