import {
  activeAmenities,
  getAmenityMeta,
  amenityLabel,
  type Amenities,
} from '@/lib/amenities'
import type { Locale } from '@/lib/i18n/display'

interface Props {
  amenities?: Amenities
  locale: Locale
  /** compact=아이콘만(카드용), full=아이콘+라벨(상세용) */
  variant?: 'compact' | 'full'
}

/**
 * 외국인 어메니티 배지. 보유한 항목만 노출 순서대로 표시.
 * compact: 아이콘 칩(카드) / full: 아이콘+영어 라벨(상세).
 */
export function AmenityBadges({ amenities, locale, variant = 'compact' }: Props) {
  const keys = activeAmenities(amenities)
  if (keys.length === 0) return null

  if (variant === 'compact') {
    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {keys.map((k) => {
          const m = getAmenityMeta(k)
          return (
            <span
              key={k}
              title={amenityLabel(k, locale)}
              className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700"
            >
              <span aria-hidden>{m.icon}</span>
              <span className="sr-only">{amenityLabel(k, locale)}</span>
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((k) => {
        const m = getAmenityMeta(k)
        return (
          <span
            key={k}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
          >
            <span aria-hidden>{m.icon}</span>
            {amenityLabel(k, locale)}
          </span>
        )
      })}
    </div>
  )
}
