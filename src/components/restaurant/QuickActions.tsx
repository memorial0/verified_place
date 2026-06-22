'use client'

import { t, type UiKey } from '@/lib/i18n/ui'
import type { Locale } from '@/lib/i18n/display'

/** 대회 방문객용 빠른 선택 프리셋 키. */
export type QuickPreset = 'eat' | 'venue' | 'team' | 'veg' | 'english' | 'tour'

const PRESETS: { key: QuickPreset; icon: string; label: UiKey }[] = [
  { key: 'eat',     icon: '🍽️', label: 'quickEat' },
  { key: 'venue',   icon: '📍', label: 'quickVenue' },
  { key: 'team',    icon: '👥', label: 'quickTeam' },
  { key: 'veg',     icon: '🥗', label: 'quickVeg' },
  { key: 'english', icon: '🗣️', label: 'quickEnglish' },
  { key: 'tour',    icon: '🗺️', label: 'quickTour' },
]

interface Props {
  locale: Locale
  active?: Partial<Record<QuickPreset, boolean>>
  onSelect: (preset: QuickPreset) => void
}

/**
 * 첫 화면/상단의 대회 방문객용 빠른 선택 버튼.
 * 누르면 관련 필터가 적용되거나(먹을 수 있는 음식/대회장 근처/단체/채식/영어),
 * 'tour' 는 내 코스 패널을 연다.
 */
export function QuickActions({ locale, active = {}, onSelect }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => {
        const on = !!active[p.key]
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm transition-all ${
              on
                ? 'bg-gray-900 text-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <span aria-hidden>{p.icon}</span>
            {t(locale, p.label)}
          </button>
        )
      })}
    </div>
  )
}
