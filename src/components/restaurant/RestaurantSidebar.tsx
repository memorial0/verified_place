'use client'

import { useEffect, useRef } from 'react'
import type { Restaurant } from '@/lib/mock/restaurants'
import type { FetchState } from '@/lib/hooks/useRestaurants'
import type { RouteSummary } from '@/lib/api/directions'
import { RestaurantCard } from './RestaurantCard'
import { RestaurantDetail } from './RestaurantDetail'
import { CoursePanel } from './CoursePanel'

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
  routeError: boolean
  onRoute: () => void
}

interface Props {
  restaurants: Restaurant[]
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
      onSelect={onSelect}
      onMove={course.move}
      onRemove={course.remove}
      onClear={course.clear}
      onBack={course.close}
      routing={course.routing}
      routeSummary={course.routeSummary}
      routeError={course.routeError}
      onRoute={course.onRoute}
    />
  ) : (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-bold text-gray-700">
          검증 식당 <span className="text-gray-400">{restaurants.length}곳</span>
          {savedCount > 0 && (
            <span className="ml-2 text-amber-500">★ {savedCount}</span>
          )}
          {course.count > 0 && (
            <button
              type="button"
              onClick={course.open}
              className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600 transition-colors hover:bg-emerald-100"
            >
              🧭 내 코스 {course.count}
            </button>
          )}
        </p>
        <SourceBadge state={state} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {restaurants.length === 0 ? (
          <p className="mt-10 text-center text-sm text-gray-400">
            조건에 맞는 식당이 없습니다.
          </p>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              ref={(el) => {
                cardRefs.current[r.id] = el
              }}
              restaurant={r}
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
    <aside className="flex h-[45vh] w-full flex-col border-t border-gray-100 bg-gray-50 md:h-full md:w-[34%] md:max-w-sm md:border-r md:border-t-0">
      {body}
    </aside>
  )
}

function SourceBadge({ state }: { state: FetchState }) {
  const map = {
    loading: { label: '불러오는 중', cls: 'bg-gray-100 text-gray-400' },
    live: { label: '● 실시간', cls: 'bg-emerald-50 text-emerald-600' },
    fallback: { label: '● 데모 데이터', cls: 'bg-amber-50 text-amber-600' },
  } as const
  const { label, cls } = map[state]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
