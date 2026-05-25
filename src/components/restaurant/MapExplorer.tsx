'use client'

import { useEffect, useState } from 'react'
import { type FilterValue } from '@/lib/mock/restaurants'
import { useRestaurants } from '@/lib/hooks/useRestaurants'
import { useSavedRestaurants } from '@/lib/hooks/useSavedRestaurants'
import { FilterChips } from './FilterChips'
import { RestaurantSidebar } from './RestaurantSidebar'
import { RestaurantMap } from './RestaurantMap'

/**
 * 지도(70%) + 사이드바 목록(30%) + 상단 필터를 묶는 클라이언트 컨테이너.
 *
 * 상태 모델:
 *   - filter      : 검증 브랜드 필터 → useRestaurants가 API/Mock에서 목록을 가져옴
 *   - hoverId     : 사이드바 카드 hover (미리보기)
 *   - selectedId  : 카드/마커 클릭 (고정 선택, 지도 panTo·사이드바 스크롤 트리거)
 *   - activeId    : hoverId ?? selectedId → 지도 오버레이 + 카드 하이라이트
 */
export function MapExplorer() {
  const [filter, setFilter] = useState<FilterValue>('all')
  const { restaurants, state } = useRestaurants(filter)
  const { isSaved, toggle: toggleSave, savedCount } = useSavedRestaurants()

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeId = hoverId ?? selectedId

  // 필터 변경 등으로 선택된 식당이 목록에서 사라지면 선택 해제
  useEffect(() => {
    if (selectedId && !restaurants.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [restaurants, selectedId])

  const handleSelect = (id: string | null) => {
    setHoverId(null)
    setSelectedId(id)
  }

  return (
    <div className="flex h-full flex-col">
      {/* 최상단 고정 필터 바 */}
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

      {/* 데스크톱: [사이드바 | 지도] / 모바일: [지도] 위 [사이드바] (col-reverse) */}
      <div className="flex flex-1 flex-col-reverse overflow-hidden md:flex-row">
        <RestaurantSidebar
          restaurants={restaurants}
          activeId={activeId}
          selectedId={selectedId}
          state={state}
          savedCount={savedCount}
          isSaved={isSaved}
          onHover={setHoverId}
          onSelect={handleSelect}
          onToggleSave={toggleSave}
        />
        <div className="relative flex-1">
          <RestaurantMap
            restaurants={restaurants}
            activeId={activeId}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>
      </div>
    </div>
  )
}
