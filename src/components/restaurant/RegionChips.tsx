'use client'

import type { Restaurant } from '@/lib/mock/restaurants'
import { REGION_OPTIONS, type Region } from '@/lib/region/region'

interface Props {
  active: Region
  onChange: (region: Region) => void
  /** 전체(region 미적용) 식당 목록 — cross-region 카운트 산정용 */
  restaurants: Restaurant[]
}

/**
 * 상단 지역 필터 칩 (전국/춘천/서울). FilterChips 위 한 줄에 배치된다.
 * 카운트는 항상 cross-region 기준이라 restaurants prop 으로 region 미적용 전체를 받는다.
 */
export function RegionChips({ active, onChange, restaurants }: Props) {
  const countFor = (sido?: string) =>
    sido ? restaurants.filter((r) => r.sido === sido).length : restaurants.length

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REGION_OPTIONS.map((opt) => {
        const isActive = active === opt.value
        const count = countFor(opt.sido)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm transition-all ${
              isActive
                ? 'border-transparent bg-gray-900 text-white shadow-md'
                : 'border-gray-200 bg-white/90 text-gray-700 hover:border-gray-300 hover:bg-white'
            }`}
          >
            {opt.label}
            <span
              className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${
                isActive ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
