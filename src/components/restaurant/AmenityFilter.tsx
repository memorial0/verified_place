'use client'

import {
  AMENITY_OPTIONS,
  amenityLabel,
  amenityNote,
  type AmenityKey,
} from '@/lib/amenities'
import type { Restaurant } from '@/lib/mock/restaurants'
import type { Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'

interface Props {
  /** 선택된 어메니티 키 (AND 조합) */
  active: AmenityKey[]
  onChange: (next: AmenityKey[]) => void
  /** 카운트 산출 대상 (지역+인증 필터가 적용된 목록) */
  restaurants: Restaurant[]
  locale: Locale
}

/**
 * 외국인 어메니티 다중선택 필터. 인증 칩(FilterChips)과는 다른 축 —
 * 토글식이고 여러 개를 동시에 켜면 모두 보유한 곳만(AND) 남는다.
 * 라벨은 영어 기본(locale 따라 ko 폴백). 카운트가 0인 항목은 흐리게.
 */
export function AmenityFilter({ active, onChange, restaurants, locale }: Props) {
  const isOn = (key: AmenityKey) => active.includes(key)
  const toggle = (key: AmenityKey) =>
    onChange(isOn(key) ? active.filter((k) => k !== key) : [...active, key])

  const countFor = (key: AmenityKey) =>
    restaurants.filter((r) => r.amenities?.[key]).length

  // 안전 주의 문구가 있는 선택 항목(예: 할랄)의 캡션 — 화면에 명시.
  const activeNotes = active
    .map((k) => amenityNote(k, locale))
    .filter((n): n is string => !!n)

  return (
    <div className="flex flex-col gap-1.5">
    <div className="flex flex-wrap items-center gap-2">
      {AMENITY_OPTIONS.map((opt) => {
        const on = isOn(opt.key)
        const count = countFor(opt.key)
        const dim = count === 0 && !on
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggle(opt.key)}
            aria-pressed={on}
            title={amenityNote(opt.key, locale) ?? undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
              on
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : dim
                  ? 'border-gray-200 bg-white/60 text-gray-400'
                  : 'border-gray-200 bg-white/90 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <span aria-hidden>{opt.icon}</span>
            {amenityLabel(opt.key, locale)}
            <span
              className={`rounded-full px-1.5 text-xs font-bold tabular-nums ${
                on ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        )
      })}
      {active.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-gray-700"
        >
          {t(locale, 'clear')}
        </button>
      )}
    </div>
      {activeNotes.map((n) => (
        <p key={n} className="text-[11px] font-medium text-amber-600">
          ⚠️ {n}
        </p>
      ))}
    </div>
  )
}
