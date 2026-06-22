'use client'

import { useEffect, useRef } from 'react'
import type { Restaurant } from '@/lib/mock/restaurants'
import type { FetchState } from '@/lib/hooks/useRestaurants'
import type { RouteSummary, DirectionsErrorKind } from '@/lib/api/directions'
import type { Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'
import { RestaurantCard } from './RestaurantCard'
import { RestaurantDetail } from './RestaurantDetail'
import { CoursePanel, type StartMode } from './CoursePanel'

/** 내 코스 패널 제어 묶음 */
export interface CourseControls {
  count: number
  show: boolean
  items: Restaurant[]
  open: () => void
  close: () => void
  move: (from: number, to: number) => void
  remove: (id: string) => void
  clear: () => void
  /** 코스 전체 길찾기 */
  routing: boolean
  routeSummary: RouteSummary | null
  /** 길찾기 실패 종류 (null=정상) */
  routeError: DirectionsErrorKind | null
  onRoute: () => void
  /** 출발점 토글 (내 위치 / 코스 첫 집) */
  startMode: StartMode
  onStartModeChange: (mode: StartMode) => void
  /** '내 위치' 였으나 위치 권한이 없어 첫 집으로 폴백한 경우 true */
  startFellBack: boolean
  /** 현재 출발점 모드에서 코스에 담을 수 있는 집 최대치 (경유지 한도) */
  maxHouses: number
  /** 직선거리 기준 순서 최적화 실행 */
  onOptimize: () => void
  /** 최적화 진행 중 */
  optimizing: boolean
  /** 최적화 가능 여부 (집 3곳 이상) */
  canOptimize: boolean
}

interface Props {
  restaurants: Restaurant[]
  locale: Locale
  activeId: string | null
  /** 클릭으로 고정 선택된 식당 → 상세 패널 전환 */
  selectedId: string | null
  state: FetchState
  savedCount: number
  course: CourseControls
  isSaved: (id: string) => boolean
  dirLoading: boolean
  routeSummary: RouteSummary | null
  onHover: (id: string | null) => void
  onSelect: (id: string | null) => void
  onToggleSave: (id: string) => void
  onDirections: (restaurant: Restaurant) => void
}

export function RestaurantSidebar({
  restaurants,
  locale,
  activeId,
  selectedId,
  state,
  savedCount,
  course,
  isSaved,
  dirLoading,
  routeSummary,
  onHover,
  onSelect,
  onToggleSave,
  onDirections,
}: Props) {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const selected = selectedId
    ? restaurants.find((r) => r.id === selectedId) ?? null
    : null

  // 목록 모드에서 활성 식당이 바뀌면 해당 카드로 스크롤 (상세/코스 모드면 ref 없음 → no-op)
  useEffect(() => {
    if (!activeId || selected || course.show) return
    cardRefs.current[activeId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [activeId, selected, course.show])

  // 렌더 우선순위: 상세 > 코스 패널 > 목록
  const body = selected ? (
    <RestaurantDetail
      restaurant={selected}
      locale={locale}
      saved={isSaved(selected.id)}
      dirLoading={dirLoading}
      routeSummary={routeSummary}
      onToggleSave={onToggleSave}
      onDirections={onDirections}
      onBack={() => onSelect(null)}
    />
  ) : course.show ? (
    <CoursePanel
      items={course.items}
      locale={locale}
      onSelect={onSelect}
      onMove={course.move}
      onRemove={course.remove}
      onClear={course.clear}
      onBack={course.close}
      routing={course.routing}
      routeSummary={course.routeSummary}
      routeError={course.routeError}
      onRoute={course.onRoute}
      startMode={course.startMode}
      onStartModeChange={course.onStartModeChange}
      startFellBack={course.startFellBack}
      maxHouses={course.maxHouses}
      onOptimize={course.onOptimize}
      optimizing={course.optimizing}
      canOptimize={course.canOptimize}
      activeStopId={activeId}
      onStopHover={onHover}
    />
  ) : (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-bold text-gray-700">
          {t(locale, 'places')}{' '}
          <span className="text-gray-400">{restaurants.length}</span>
          {savedCount > 0 && (
            <span className="ml-2 text-amber-500">★ {savedCount}</span>
          )}
          {course.count > 0 && (
            <button
              type="button"
              onClick={course.open}
              className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600 transition-colors hover:bg-emerald-100"
            >
              🧭 {t(locale, 'myCourse')} {course.count}
            </button>
          )}
        </p>
        <SourceBadge state={state} locale={locale} />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {restaurants.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-400">
            {t(locale, 'noResults')}
          </p>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              ref={(el) => {
                cardRefs.current[r.id] = el
              }}
              restaurant={r}
              locale={locale}
              active={activeId === r.id}
              saved={isSaved(r.id)}
              onHover={onHover}
              onSelect={onSelect}
              onToggleSave={onToggleSave}
            />
          ))
        )}
      </div>
    </>
  )

  return (
    <aside className="flex h-[45vh] w-full min-h-0 flex-col border-t border-gray-100 bg-gray-50 md:h-full md:w-[380px] md:shrink-0 md:border-r md:border-t-0">
      {body}
    </aside>
  )
}

function SourceBadge({ state, locale }: { state: FetchState; locale: Locale }) {
  const map = {
    loading: { key: 'sourceLoading', cls: 'bg-gray-100 text-gray-400' },
    live: { key: 'sourceLive', cls: 'bg-emerald-50 text-emerald-600' },
    fallback: { key: 'sourceDemo', cls: 'bg-amber-50 text-amber-600' },
  } as const
  const { key, cls } = map[state]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {t(locale, key)}
    </span>
  )
}
