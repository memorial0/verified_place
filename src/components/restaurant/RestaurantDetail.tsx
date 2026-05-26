import {
  VERIFICATION_META,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { RouteSummary } from '@/lib/api/directions'
import { VerificationBadge } from './VerificationBadge'

interface Props {
  restaurant: Restaurant
  saved: boolean
  dirLoading: boolean
  routeSummary: RouteSummary | null
  onToggleSave: (id: string) => void
  onDirections: (restaurant: Restaurant) => void
  onBack: () => void
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`)
const fmtDur = (s: number) => `${Math.round(s / 60)}분`

/**
 * 사이드바 상세 패널. 카드(또는 마커) 클릭 시 목록 대신 표시된다.
 * 노출 정보: 이름 · 키워드 · 한 줄 설명 · 가야 하는 이유 · 인증 뱃지 · 주소 · 저장 · 뒤로가기
 */
export function RestaurantDetail({
  restaurant,
  saved,
  dirLoading,
  routeSummary,
  onToggleSave,
  onDirections,
  onBack,
}: Props) {
  const primary = primaryVerification(restaurant)
  const accent = primary ? VERIFICATION_META[primary.code].color : '#111827'

  // 네이버 지도 외부 링크 — 이름(없으면 주소)으로 검색해 해당 장소를 띄운다
  const naverMapUrl = `https://map.naver.com/p/search/${encodeURIComponent(
    restaurant.name || restaurant.addressRoad,
  )}`

  return (
    <div className="flex h-full flex-col">
      {/* 8) 목록으로 돌아가기 */}
      <div className="flex items-center gap-1 border-b border-gray-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
        >
          <span aria-hidden>←</span> 목록으로
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <span className="text-xs font-medium text-gray-400">
          {restaurant.category}
        </span>

        {/* 1) 이름 */}
        <h2 className="mt-0.5 text-2xl font-extrabold leading-tight text-gray-900">
          {restaurant.name}
        </h2>

        {/* 2) 대표 키워드 */}
        {restaurant.keywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {restaurant.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full px-2.5 py-1 text-sm font-bold"
                style={{ color: accent, backgroundColor: `${accent}14` }}
              >
                #{k}
              </span>
            ))}
          </div>
        )}

        {/* 3) 한 줄 설명 */}
        {restaurant.tagline && (
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {restaurant.tagline}
          </p>
        )}

        {/* 4) 가야 하는 이유 */}
        {restaurant.reason && (
          <div
            className="mt-4 rounded-xl border-l-[3px] bg-gray-50 p-3 text-sm leading-relaxed text-gray-700"
            style={{ borderColor: accent }}
          >
            <p className="mb-1 font-bold text-gray-900">이 곳을 가야 하는 이유</p>
            {restaurant.reason}
          </div>
        )}

        {/* 5) 인증 뱃지 */}
        <section className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            인증
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {restaurant.verifications.map((v, i) => (
              <VerificationBadge key={`${v.code}-${i}`} verification={v} />
            ))}
          </div>
        </section>

        {/* 6) 주소 */}
        <section className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            주소
          </h3>
          <p className="flex items-start gap-1.5 text-sm text-gray-700">
            <span aria-hidden>📍</span>
            {restaurant.addressRoad}
          </p>
        </section>
      </div>

      {/* 행동 전환 CTA — 항상 보이도록 하단 sticky 고정 */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] backdrop-blur">
        {/* 경로 요약 (인앱 자동차 길찾기 결과) */}
        {routeSummary && (
          <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-1.5 text-xs font-semibold text-gray-700">
            <span aria-hidden>🚗</span>
            <span>{fmtDist(routeSummary.distance)}</span>
            <span className="text-gray-300">·</span>
            <span>{fmtDur(routeSummary.duration)}</span>
            {routeSummary.taxiFare != null && (
              <>
                <span className="text-gray-300">·</span>
                <span>택시 {routeSummary.taxiFare.toLocaleString()}원</span>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {/* 1) 📍 길찾기 → 인앱 자동차 경로 (지도에 표시) */}
          <button
            type="button"
            onClick={() => onDirections(restaurant)}
            disabled={dirLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: accent }}
          >
            {dirLoading ? '경로 찾는 중…' : '📍 길찾기'}
          </button>

          {/* 2) ★ 저장하기 / 저장됨 → useSavedRestaurants 연결 */}
          <button
            type="button"
            onClick={() => onToggleSave(restaurant.id)}
            aria-pressed={saved}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-colors ${
              saved
                ? 'bg-amber-400 text-white hover:bg-amber-500'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {saved ? '★ 저장됨' : '☆ 저장하기'}
          </button>
        </div>

        {/* 대중교통·도보는 네이버 지도로 (자동차 외 경로) */}
        <a
          href={naverMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
        >
          대중교통·도보는 네이버 지도에서 열기 →
        </a>
      </div>
    </div>
  )
}
