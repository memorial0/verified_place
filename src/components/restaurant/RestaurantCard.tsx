import { forwardRef } from 'react'
import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import { displayName, type Locale } from '@/lib/i18n/display'

interface Props {
  restaurant: Restaurant
  locale: Locale
  active: boolean
  saved: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onToggleSave: (id: string) => void
}

/**
 * 사이드바 목록의 티저 카드.
 *   1) 이름  2) 대표 키워드 3개(#태그)  3) 한 줄 설명  5) 저장 버튼
 *   → 클릭하면 사이드바가 상세 패널(RestaurantDetail)로 전환된다.
 *   → "가야 하는 이유"·주소·전체 인증 뱃지는 상세 패널에서 노출.
 */
export const RestaurantCard = forwardRef<HTMLDivElement, Props>(
  function RestaurantCard(
    { restaurant, locale, active, saved, onHover, onSelect, onToggleSave },
    ref,
  ) {
    const primary = primaryVerification(restaurant)
    const accent = primary ? getVerificationMeta(primary.code).color : '#111827'

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onMouseEnter={() => onHover(restaurant.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(restaurant.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect(restaurant.id)
          }
        }}
        aria-pressed={active}
        className={`group relative cursor-pointer rounded-2xl border bg-white p-4 transition-all hover:shadow-md ${
          active ? 'border-transparent shadow-md' : 'border-gray-100'
        }`}
        style={active ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
      >
        {/* 5) 저장 버튼 */}
        <SaveButton
          saved={saved}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSave(restaurant.id)
          }}
        />

        {/* 1) 이름 */}
        <h3 className="pr-9 text-lg font-extrabold leading-snug text-gray-900">
          {displayName(restaurant, locale)}
        </h3>

        {/* 2) 대표 키워드 3개 */}
        {restaurant.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {restaurant.keywords.slice(0, 3).map((k) => (
              <span
                key={k}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
              >
                #{k}
              </span>
            ))}
          </div>
        )}

        {/* 3) 한 줄 설명 */}
        {restaurant.tagline && (
          <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {restaurant.tagline}
          </p>
        )}

        {/* (보조) 카테고리 + 인증 — 작은 메타 라인 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-gray-100 pt-2.5 text-xs text-gray-400">
          <span>{restaurant.category}</span>
          {restaurant.verifications.map((v, i) => {
            const meta = getVerificationMeta(v.code)
            return (
              <span
                key={`${v.code}-${i}`}
                className="inline-flex items-center gap-0.5 font-medium"
                style={{ color: meta.color }}
                title={meta.label}
              >
                <span aria-hidden>·</span>
                {meta.emoji.repeat(Math.max(1, v.rating ?? 1))}
                {meta.label}
              </span>
            )
          })}
        </div>
      </div>
    )
  },
)

function SaveButton({
  saved,
  onClick,
}: {
  saved: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? '저장 취소' : '저장'}
      className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all ${
        saved
          ? 'bg-amber-50 text-amber-500'
          : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
      }`}
    >
      {saved ? '★' : '☆'}
    </button>
  )
}
