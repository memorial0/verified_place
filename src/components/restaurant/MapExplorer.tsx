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
  DirectionsError,
  type DirectionsErrorKind,
  type DirectionsResult,
  type LatLng,
} from '@/lib/api/directions'
import { optimizeCourseOrder, haversineMeters, type OptimizeOptions } from '@/lib/course/order'
import type { StartMode } from './CoursePanel'
import { type Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'
import { filterByRegion, CHUNCHEON_VENUE_CENTER, type Region } from '@/lib/region/region'
import { matchesAmenities, type AmenityKey } from '@/lib/amenities'
import { verificationLabel, getVerificationMeta } from '@/lib/verifications'
import { situationLabel, venueAreaLabel } from '@/lib/visitor'
import { FilterChips } from './FilterChips'
import { AmenityFilter } from './AmenityFilter'
import { QuickActions, type QuickPreset } from './QuickActions'
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
/** 기본 상태(필터 없음)에서 지도/리스트에 노출할 추천 식당 최대 수. */
const RECOMMENDED_LIMIT = 20
/** '대회장 근처' 프리셋 반경(m). */
const NEAR_VENUE_RADIUS = 2500
/** 추천 정렬 시 visitor_ready 식당에 주는 거리 가산점(m) — 주변 우선이되 추천 식당을 살짝 우대. */
const VISITOR_BOOST_M = 800
/** userLoc 을 신뢰할 반경(m) — 춘천 밖 좌표(헤드리스/엉뚱한 IP위치)는 무시하고 대회장 폴백. */
const USER_LOC_MAX_M = 50000

const venueDist = (r: Restaurant) =>
  haversineMeters(CHUNCHEON_VENUE_CENTER, { lat: r.lat, lng: r.lng })

/**
 * 검색 매칭 (대소문자 무시). 대상: 식당명·카테고리·주소·외국인 설명/주의·
 * 인증 라벨(현지어+한국어)·추천상황·지역대(원시값+현지어 라벨).
 */
function matchesQuery(r: Restaurant, q: string, locale: Locale): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const parts: (string | undefined | null)[] = [
    r.name,
    r.category,
    r.addressRoad,
    r.visitorNoteEn,
    r.foodWarningEn,
    r.recommendedSituation,
    situationLabel(r.recommendedSituation, locale),
    r.venueArea,
    venueAreaLabel(r.venueArea, locale),
    ...r.verifications.flatMap((v) => [
      verificationLabel(v.code, locale),
      getVerificationMeta(v.code).label,
    ]),
  ]
  return parts.join('  ').toLowerCase().includes(needle)
}

export function MapExplorer({ locale }: { locale: Locale }) {
  // ─── 지역: 춘천 전용(MVP) ─────────────────────────────────────────────────
  // 전국·서울 탭은 제거. 항상 춘천만 대상으로 운영한다.
  const region: Region = 'chuncheon'
  const [filter, setFilter] = useState<FilterValue>('all')
  // 외국인 어메니티 필터(AND 다중선택). 인증 필터와 독립 축.
  const [amenityFilter, setAmenityFilter] = useState<AmenityKey[]>([])
  // '대회장 근처' 프리셋 — 송암스포츠타운 반경 내만.
  const [nearVenue, setNearVenue] = useState(false)
  // 페이지네이션 — 한 페이지 20개(가까운 순). 지도 마커도 페이지당 ≤20 유지.
  const [page, setPage] = useState(0)
  // 검색어 — 춘천 전체에서 검색.
  const [query, setQuery] = useState('')
  const hasQuery = query.trim().length > 0
  // 사용자 현재 위치 — 입장 시 1회 시도(거부/실패 시 null). 주변 추천 정렬 기준.
  const [userLoc, setUserLoc] = useState<LatLng | null>(null)
  const { restaurants: allRestaurants, state } = useRestaurants()

  useEffect(() => {
    let cancelled = false
    getCurrentPosition()
      .then((p) => {
        if (!cancelled) setUserLoc(p)
      })
      .catch(() => {
        /* 권한 거부/미지원 — 대회장 중심으로 폴백 */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // 필터/검색이 바뀌면 1페이지로 리셋 (빈 페이지에 머무르지 않도록).
  useEffect(() => {
    setPage(0)
  }, [filter, amenityFilter, nearVenue, query])

  // 정렬 기준 위치: 사용자 위치(춘천 인근일 때만) → 없으면 대회장 중심으로 조용히 폴백.
  const nearChuncheon =
    !!userLoc && haversineMeters(CHUNCHEON_VENUE_CENTER, userLoc) < USER_LOC_MAX_M
  const rankOrigin = nearChuncheon ? userLoc! : CHUNCHEON_VENUE_CENTER
  const rankDist = (r: Restaurant) =>
    haversineMeters(rankOrigin, { lat: r.lat, lng: r.lng })

  // 클라이언트 필터링 파이프라인 (춘천 전체 기준):
  //   chuncheon    → 춘천 식당 전체. 기본 풀도 전체 → visitor_ready 22곳에 갇히지 않음.
  //   verifScoped  → 인증 필터 적용. 어메니티 카운트 모수.
  //   matched      → 어메니티 AND + 대회장 근처 + 검색까지 적용한 "조건 일치" 집합.
  //   sortedMatched→ 가까운 순(+visitor_ready 가산점)으로 정렬한 전체 일치 목록.
  //   displayed    → 그 중 현재 페이지 20개. 지도 마커 = 리스트 = displayed (항상 ≤20 동기화).
  const chuncheon = filterByRegion(allRestaurants, region)
  const verifScoped =
    filter === 'all'
      ? chuncheon
      : chuncheon.filter((r) => r.verifications.some((v) => v.code === filter))
  const matched = verifScoped.filter(
    (r) =>
      matchesAmenities(r.amenities, amenityFilter) &&
      (!nearVenue || venueDist(r) <= NEAR_VENUE_RADIUS) &&
      matchesQuery(r, query, locale),
  )
  const anyFilterActive =
    filter !== 'all' || amenityFilter.length > 0 || nearVenue || hasQuery
  // 정렬: 가까운 순(주변 위주) + visitor_ready 가산점(추천 식당 살짝 우대, 독점 아님).
  const score = (r: Restaurant) => rankDist(r) - (r.visitorReady ? VISITOR_BOOST_M : 0)
  const sortedMatched = [...matched].sort((a, b) => score(a) - score(b))

  // 페이지네이션 — 페이지당 RECOMMENDED_LIMIT(20)개. 페이지는 [0, pageCount-1] 로 클램프.
  const pageCount = Math.max(1, Math.ceil(sortedMatched.length / RECOMMENDED_LIMIT))
  const safePage = Math.min(page, pageCount - 1)
  const displayed = sortedMatched.slice(
    safePage * RECOMMENDED_LIMIT,
    safePage * RECOMMENDED_LIMIT + RECOMMENDED_LIMIT,
  )
  const rangeStart = sortedMatched.length === 0 ? 0 : safePage * RECOMMENDED_LIMIT + 1
  const rangeEnd = safePage * RECOMMENDED_LIMIT + displayed.length
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
  // 코스 길찾기 실패 종류 (null=정상). notfound=경로 없음 / temporary=인증·서버 실패
  const [courseRouteError, setCourseRouteError] = useState<DirectionsErrorKind | null>(null)
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
    setCourseRouteError(null)
    setStartFellBack(false)
    setRoute((r) => (r && r.destId === null ? null : r))
  }, [course.items, startMode])

  // 대회 방문객용 빠른 선택 — 관련 필터 적용 또는 해당 섹션으로 이동.
  const applyQuick = (preset: QuickPreset) => {
    setHoverId(null)
    setPreviewId(null)
    switch (preset) {
      case 'eat': // 주문 가능한 곳 = 영어 메뉴
        setNearVenue(false); setFilter('all'); setAmenityFilter(['english_menu']); break
      case 'venue':
        setFilter('all'); setAmenityFilter([]); setNearVenue((v) => !v); break
      case 'team':
        setNearVenue(false); setFilter('all'); setAmenityFilter(['group_friendly']); break
      case 'veg':
        setNearVenue(false); setFilter('all'); setAmenityFilter(['vegetarian']); break
      case 'english':
        setNearVenue(false); setFilter('all'); setAmenityFilter(['english_support']); break
      case 'tour': // 짧은 코스 = 내 코스 패널 열기
        setShowCourse(true); break
    }
  }

  // 빠른 선택 버튼의 활성 표시용 — 현재 단일 어메니티만 선택된 상태인지.
  const onlyAmenity = (k: AmenityKey) => amenityFilter.length === 1 && amenityFilter[0] === k
  const activePresets: Partial<Record<QuickPreset, boolean>> = {
    eat: onlyAmenity('english_menu'),
    venue: nearVenue,
    team: onlyAmenity('group_friendly'),
    veg: onlyAmenity('vegetarian'),
    english: onlyAmenity('english_support'),
  }

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
    setCourseRouteError(null)
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
    } catch (e) {
      // 인증/서버/네트워크 실패는 '일시적', 422 만 '경로 없음'. 미상은 일시적으로 처리.
      setCourseRouteError(e instanceof DirectionsError ? e.kind : 'temporary')
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
        <div className="flex flex-col gap-2.5">
          {/* 0) 검색창 — 리스트/지도 동시 필터 */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setHoverId(null)
              }}
              placeholder={t(locale, 'searchPlaceholder')}
              aria-label={t(locale, 'searchPlaceholder')}
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm focus:border-gray-900 focus:outline-none"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t(locale, 'clear')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* 1) 대회 방문객용 빠른 선택 */}
          <QuickActions locale={locale} active={activePresets} onSelect={applyQuick} />

          {/* 2) 외국인 편의 필터 (우선 노출) */}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {t(locale, 'forVisitors')}
            </p>
            <AmenityFilter
              active={amenityFilter}
              onChange={(next) => {
                setAmenityFilter(next)
                setHoverId(null)
              }}
              restaurants={verifScoped}
              locale={locale}
            />
          </div>

          {/* 3) 인증 필터 (보조) */}
          <details className="group">
            <summary className="cursor-pointer list-none text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600">
              {t(locale, 'verifiedBy')} <span className="font-normal">▾</span>
            </summary>
            <div className="mt-1.5">
              <FilterChips
                active={filter}
                onChange={(v) => {
                  setFilter(v)
                  setHoverId(null)
                }}
                restaurants={chuncheon}
                locale={locale}
              />
            </div>
          </details>

          {/* 4) 현재 표시 안내 (전체 결과 수). 페이지 이동은 리스트 하단 페이저에서. */}
          <p className="text-[11px] text-gray-500">
            {nearVenue
              ? t(locale, 'resultsNear')
              : !anyFilterActive
                ? t(locale, nearChuncheon ? 'recommendedNearYou' : 'recommendedNote')
                : ''}
            <span className="ml-1 font-bold text-gray-700">· {sortedMatched.length}</span>
          </p>
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
          pagination={{
            page: safePage,
            pageCount,
            rangeStart,
            rangeEnd,
            total: sortedMatched.length,
            onPrev: () => {
              setPage((p) => Math.max(0, p - 1))
              setHoverId(null)
            },
            onNext: () => {
              setPage((p) => Math.min(pageCount - 1, p + 1))
              setHoverId(null)
            },
          }}
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
            recenter={nearChuncheon ? userLoc : null}
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
