'use client'

import {
  FILTER_OPTIONS,
  type FilterValue,
  type Restaurant,
} from '@/lib/mock/restaurants'
import { verificationLabel } from '@/lib/verifications'
import { t } from '@/lib/i18n/ui'
import type { Locale } from '@/lib/i18n/display'

interface Props {
  active: FilterValue
  onChange: (value: FilterValue) => void
  restaurants: Restaurant[]
  locale: Locale
}

/** 상단 칩 형태의 검증 브랜드 필터. 클릭 시 해당 인증 보유 식당만 노출. */
export function FilterChips({ active, onChange, restaurants, locale }: Props) {
  const labelFor = (value: FilterValue) =>
    value === 'all' ? t(locale, 'filterAll') : verificationLabel(value, locale)
  const countFor = (value: FilterValue) =>
    value === 'all'
      ? restaurants.length
      : restaurants.filter((r) => r.verifications.some((v) => v.code === value))
          .length

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.value
        const count = countFor(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm transition-all ${
              isActive
                ? 'border-transparent text-white shadow-md'
                : 'border-gray-200 bg-white/90 text-gray-700 hover:border-gray-300 hover:bg-white'
            }`}
            style={isActive ? { backgroundColor: opt.color } : undefined}
          >
            {labelFor(opt.value)}
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
