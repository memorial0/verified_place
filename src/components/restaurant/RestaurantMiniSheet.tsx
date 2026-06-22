'use client'

import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import { displayName, type Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'
import { verificationLabel } from '@/lib/verifications'
import { categoryLabel, visibleTags } from '@/lib/categories'
import { OpenStatusBadge } from './OpenStatusBadge'

interface Props {
  restaurant: Restaurant
  locale: Locale
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
  locale,
  inCourse,
  dirLoading,
  onDirections,
  onDetail,
  onToggleCourse,
  onClose,
}: Props) {
  const primary = primaryVerification(restaurant)
  const primaryMeta = primary ? getVerificationMeta(primary.code) : null
  const accent = primaryMeta?.color ?? '#111827'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-md animate-[slideUp_0.18s_ease-out] rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur">
        {/* 헤더: 카테고리 · 이름 · 닫기 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-medium text-gray-400">
              {categoryLabel(restaurant.category, locale)}
            </span>
            <h3 className="truncate text-lg font-extrabold leading-snug text-gray-900">
              {displayName(restaurant, locale)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(locale, 'close')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 대표 인증 + 키워드 + 영업 상태 */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <OpenStatusBadge hours={restaurant.openingHours ?? null} />
          {primary && primaryMeta && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ color: accent, backgroundColor: `${accent}14` }}
            >
              {primaryMeta.emoji.repeat(Math.max(1, primary.rating ?? 1))}
              {verificationLabel(primary.code, locale)}
            </span>
          )}
          {visibleTags(restaurant.keywords, restaurant.sigungu).slice(0, 2).map((k) => (
            <span
              key={k}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500"
            >
              #{categoryLabel(k, locale)}
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
            {dirLoading ? t(locale, 'directionsLoading') : `📍 ${t(locale, 'directions')}`}
          </button>
          <button
            type="button"
            onClick={() => onDetail(restaurant.id)}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
          >
            📄 {t(locale, 'detailView')}
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
            {inCourse ? `🧭 ${t(locale, 'inCourse')}` : `🧭 ${t(locale, 'addToCourse')}`}
          </button>
        </div>
      </div>
    </div>
  )
}
