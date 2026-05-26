'use client'

import {
  VERIFICATION_META,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'

interface Props {
  restaurant: Restaurant
  /** 이미 내 코스에 담겼는지 */
  inCourse: boolean
  dirLoading: boolean
  onDirections: (restaurant: Restaurant) => void
  onDetail: (id: string) => void
  onToggleCourse: (id: string) => void
  onClose: () => void
}

/**
 * 마커 클릭 시 지도 하단에서 올라오는 미니 바텀시트.
 * 빠른 행동 3개만 노출: 📍 길찾기 · 📄 상세보기 · 🧭 코스에 추가.
 * 자세한 정보는 "상세보기"로 기존 상세 패널(RestaurantDetail)을 연다.
 */
export function RestaurantMiniSheet({
  restaurant,
  inCourse,
  dirLoading,
  onDirections,
  onDetail,
  onToggleCourse,
  onClose,
}: Props) {
  const primary = primaryVerification(restaurant)
  const accent = primary ? VERIFICATION_META[primary.code].color : '#111827'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-md animate-[slideUp_0.18s_ease-out] rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur">
        {/* 헤더: 카테고리 · 이름 · 닫기 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-medium text-gray-400">
              {restaurant.category}
            </span>
            <h3 className="truncate text-lg font-extrabold leading-snug text-gray-900">
              {restaurant.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 대표 인증 + 키워드 */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {primary && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ color: accent, backgroundColor: `${accent}14` }}
            >
              {VERIFICATION_META[primary.code].emoji.repeat(
                Math.max(1, primary.rating ?? 1),
              )}
              {VERIFICATION_META[primary.code].label}
            </span>
          )}
          {restaurant.keywords.slice(0, 2).map((k) => (
            <span
              key={k}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500"
            >
              #{k}
            </span>
          ))}
        </div>

        {/* 빠른 행동 3개 */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onDirections(restaurant)}
            disabled={dirLoading}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {dirLoading ? '경로…' : '📍 길찾기'}
          </button>
          <button
            type="button"
            onClick={() => onDetail(restaurant.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            📄 상세보기
          </button>
          <button
            type="button"
            onClick={() => onToggleCourse(restaurant.id)}
            aria-pressed={inCourse}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
              inCourse
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {inCourse ? '🧭 코스에 담김' : '🧭 코스에 추가'}
          </button>
        </div>
      </div>
    </div>
  )
}
