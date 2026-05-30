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
  MAX_WAYPOINTS,
  type DirectionsResult,
  type LatLng,
} from '@/lib/api/directions'
import { optimizeCourseOrder, type OptimizeOptions } from '@/lib/course/order'
import type { StartMode } from './CoursePanel'
import { type Locale } from '@/lib/i18n/display'
import { filterByRegion, type Region } from '@/lib/region/region'
import { FilterChips } from './FilterChips'
import { RegionChips } from './RegionChips'
import { RestaurantSidebar } from './RestaurantSidebar'
import { RestaurantMap } from './RestaurantMap'
import { RestaurantMiniSheet } from './RestaurantMiniSheet'

// destId: 단일 식당 경로면 그 id, 코스 전체 경로면 null
type ActiveRoute = DirectionsResult & { destId: string | null; origin: LatLng }

/**
 * Directions 15 경유지 한도(15)로부터 코스에 담을 수 있는 집 최대치.
 * - 코스 첫 집 출발: 집이 곧 출발·도착 → 출발1 + 경유15 + 도착1 = 17곳
 * - 내 위치 출발:   내 위치가 출발 → 집은 경유15 + 도착1 = 16곳
 */
const maxCourseHouses = (mode: StartMode) =>
  mode === 'me' ? MAX_WAYPOINTS + 1 : MAX_WAYPOINTS + 2

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
  // ─── 로케일 ──────────────────────────────────────────────────────────────
  // 임시 상수 (ko 고정). 헬퍼가 ko 분기로 떨어지므로 displayName(r, locale) === r.name.
  //
  // 로케일 전환 UX 도입 시 이 줄만 교체:
  //   (가) URL 기반:  usePathname()/useSearchParams() 로 /en|/ja|/zh 또는 ?lang= 파싱
  //   (나) Context:  layout.tsx 에 LocaleProvider 후 const locale = useLocale()
  // 자식 컴포넌트(Sidebar/Map/MiniSheet) 시그니처는 그대로 둔다.
  const locale: Locale = 'ko'

  // ─── 지역 ────────────────────────────────────────────────────────────────
  // 춘천 거점 제품 기본값. 새로고침 시 항상 chuncheon 으로 초기화(MVP).
  // 추후 URL/localStorage 동기화는 별도 PR.
  const [region, setRegion] = useState<Region>('chuncheon')
  const [filter, setFilter] = useState<FilterValue>('all')
  const { restaurants: allRestaurants, state } = useRestaurants()

  // 클라이언트 2단계 필터링:
  //   allRestaurants → RegionChips 가 cross-region 카운트 (전국/춘천/서울)
  //   regionScoped   → FilterChips 가 region 내 검증 카운트
  //   displayed      → 지도/사이드바 표시 데이터
  const regionScoped = filterByRegion(allRestaurants, region)
  const displayed =
    filter === 'all'
      ? regionScoped
      : regionScoped.filter((r) => r.verifications.some((v) => v.code === filter))
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
  // 출발점: 기본은 '코스 첫 집'. '내 위치'는 출발 좌표로만 쓰고 코스 항목엔 넣지 않는다.
  const [startMode, setStartMode] = useState<StartMode>('first')
  // '내 위치' 선택했으나 위치 권한이 없어 첫 집으로 폴백한 경우 안내문구 노출
  const [startFellBack, setStartFellBack] = useState(false)
  const [optimizing, setOptimizing] = useState(false)

  // 필터로 목록이 줄어도 코스/저장 항목을 해석할 수 있도록, 본 적 있는 식당을 누적 보관
  const lookupRef = useRef<Map<string, Restaurant>>(new Map())
  for (const r of allRestaurants) lookupRef.current.set(r.id, r)
  const courseItems = course.items
    .map((id) => lookupRef.current.get(id))
    .filter((r): r is Restaurant => Boolean(r))

  // 활성 식당이 목록에서 사라지면 관련 상태 해제
  useEffect(() => {
    const gone = (id: string | null) => id && !displayed.some((r) => r.id === id)
    if (gone(selectedId)) {
      setSelectedId(null)
      setRoute(null)
    }
    if (gone(previewId)) setPreviewId(null)
  }, [displayed, selectedId, previewId])

  // 코스 구성/순서·출발점이 바뀌면 그려둔 코스 경로는 낡으므로 해제 (단일 식당 경로는 유지)
  useEffect(() => {
    setCourseRouteError(false)
    setStartFellBack(false)
    setRoute((r) => (r && r.destId === null ? null : r))
  }, [course.items, startMode])

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

  // 코스 전체를 순서대로 잇는 경로.
  //   - 코스 첫 집 출발: 집들이 곧 출발→경유→도착
  //   - 내 위치 출발:   내 위치를 맨 앞에 붙이고 집들은 경유→도착 (위치는 코스 항목 아님)
  //     위치 권한 없음/거부 시 첫 집으로 폴백하고 안내문구를 띄운다 (크래시 없이).
  const requestCourseDirections = async () => {
    const houses = courseItems
      .slice(0, maxCourseHouses(startMode))
      .map((r) => ({ lat: r.lat, lng: r.lng }))
    if (houses.length < 2) return
    setCourseRouting(true)
    setCourseRouteError(false)
    setStartFellBack(false)

    // 출발 좌표 결정 (내 위치 모드면 현재 위치 시도 → 실패 시 첫 집 폴백)
    let points = houses
    if (startMode === 'me') {
      try {
        const me = await getCurrentPosition()
        // 내 위치 + 집들. 집은 최대 maxCourseHouses('me')곳까지만 (경유15+도착1)
        points = [me, ...houses]
      } catch {
        setStartFellBack(true) // 권한 거부/실패 → 첫 집 출발로 폴백
      }
    }

    try {
      const { path, summary } = await fetchRouteThrough(points)
      setRoute({ destId: null, origin: points[0], path, summary })
    } catch {
      setCourseRouteError(true)
      setRoute(null)
    } finally {
      setCourseRouting(false)
    }
  }

  // 코스 순서 최적화 (직선거리 기준 휴리스틱, 키·네트워크 무관).
  //   - 코스 첫 집 출발: 첫 집 고정 + 나머지를 더 짧은 동선으로 재정렬
  //   - 내 위치 출발:   현재 위치에서 가까운 순서로 재정렬 (실패 시 첫 집 기준 폴백)
  // 순서만 바꾸고 경로는 그리지 않는다 → 사용자가 이후 '길찾기'로 도로경로를 채운다.
  const optimizeCourse = async () => {
    if (courseItems.length < 3) return // 2개 이하는 순서 의미 없음
    setOptimizing(true)
    setStartFellBack(false)
    try {
      let opts: OptimizeOptions = {}
      if (startMode === 'me') {
        try {
          opts = { start: await getCurrentPosition() }
        } catch {
          setStartFellBack(true) // 위치 실패 → 첫 집 기준으로 최적화
        }
      }
      const ordered = optimizeCourseOrder(
        courseItems,
        (r) => ({ lat: r.lat, lng: r.lng }),
        opts,
      )
      course.reorder(ordered.map((r) => r.id))
    } finally {
      setOptimizing(false)
    }
  }

  // 미니시트 대상 — 코스 핀은 필터로 목록에서 빠질 수 있어 lookupRef 까지 폴백한다.
  const previewRestaurant = previewId
    ? displayed.find((r) => r.id === previewId) ??
      lookupRef.current.get(previewId) ??
      null
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="z-10 shrink-0 overflow-x-auto border-b border-gray-100 bg-white/80 px-4 py-2.5 backdrop-blur">
        <div className="flex flex-col gap-2">
          <RegionChips
            active={region}
            onChange={(r) => {
              setRegion(r)
              setHoverId(null)
              setPreviewId(null)
            }}
            restaurants={allRestaurants}
          />
          <FilterChips
            active={filter}
            onChange={(v) => {
              setFilter(v)
              setHoverId(null)
            }}
            restaurants={regionScoped}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden md:flex-row">
        <RestaurantSidebar
          restaurants={displayed}
          locale={locale}
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
            startMode,
            onStartModeChange: setStartMode,
            startFellBack,
            maxHouses: maxCourseHouses(startMode),
            onOptimize: optimizeCourse,
            optimizing,
            canOptimize: courseItems.length >= 3,
          }}
          isSaved={isSaved}
          dirLoading={dirLoading}
          routeSummary={route && route.destId === selectedId ? route.summary : null}
          onHover={setHoverId}
          onSelect={handleSelect}
          onToggleSave={toggleSave}
          onDirections={requestDirections}
        />
        <div className="relative min-h-0 flex-1">
          <RestaurantMap
            restaurants={displayed}
            locale={locale}
            region={region}
            activeId={activeId}
            selectedId={previewId ?? selectedId}
            previewId={previewId}
            route={route}
            courseStops={courseItems}
            startFromMe={startMode === 'me'}
            courseRouteActive={!!route && route.destId === null}
            onPreview={handlePreview}
            onHover={setHoverId}
            onClear={handleClear}
          />

          {previewRestaurant && (
            <RestaurantMiniSheet
              restaurant={previewRestaurant}
              locale={locale}
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
