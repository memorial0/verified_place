import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { RouteSummary } from '@/lib/api/directions'
import { displayName, type Locale } from '@/lib/i18n/display'
import { VerificationBadge } from './VerificationBadge'
import { AmenityBadges } from './AmenityBadges'
import { activeAmenities } from '@/lib/amenities'
import { situationLabel, venueAreaLabel } from '@/lib/visitor'
import { VerificationMetaPanel } from './VerificationMetaPanel'
import { OpenStatusBadge } from './OpenStatusBadge'
import { WeeklyHours } from './WeeklyHours'

interface Props {
  restaurant: Restaurant
  locale: Locale
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
  locale,
  saved,
  dirLoading,
  routeSummary,
  onToggleSave,
  onDirections,
  onBack,
}: Props) {
  const primary = primaryVerification(restaurant)
  const accent = primary ? getVerificationMeta(primary.code).color : '#111827'

  // 네이버 지도 외부 링크 — 이름(없으면 주소)으로 검색해 해당 장소를 띄운다.
  // ⚠️ 네이버 검색 인덱스는 한국어 상호 기준이라 화면 로케일과 무관하게
  //    restaurant.name(ko) 을 그대로 쓴다. displayName 으로 바꾸지 말 것.
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <span className="text-xs font-medium text-gray-400">
          {restaurant.category}
        </span>

        {/* 1) 이름 */}
        <h2 className="mt-0.5 text-2xl font-extrabold leading-tight text-gray-900">
          {displayName(restaurant, locale)}
        </h2>

        {/* 영업 상태 뱃지 (현재시각 기준, 클라이언트 계산) */}
        <div className="mt-2">
          <OpenStatusBadge hours={restaurant.openingHours ?? null} />
        </div>

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

        {/* 4.3) 외국인 방문객용 영어 설명·주의 + 상황/지역대 태그 */}
        {(restaurant.visitorNoteEn ||
          restaurant.foodWarningEn ||
          situationLabel(restaurant.recommendedSituation, locale) ||
          venueAreaLabel(restaurant.venueArea, locale)) && (
          <section className="mt-4 space-y-2">
            {(situationLabel(restaurant.recommendedSituation, locale) ||
              venueAreaLabel(restaurant.venueArea, locale)) && (
              <div className="flex flex-wrap gap-1.5">
                {venueAreaLabel(restaurant.venueArea, locale) && (
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                    📍 {venueAreaLabel(restaurant.venueArea, locale)}
                  </span>
                )}
                {situationLabel(restaurant.recommendedSituation, locale) && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                    {situationLabel(restaurant.recommendedSituation, locale)}
                  </span>
                )}
              </div>
            )}
            {restaurant.visitorNoteEn && (
              <p className="text-sm leading-relaxed text-gray-700">
                {restaurant.visitorNoteEn}
              </p>
            )}
            {restaurant.foodWarningEn && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-700">
                ⚠️ {restaurant.foodWarningEn}
              </p>
            )}
          </section>
        )}

        {/* 4.5) 외국인 어메니티 (보유한 것만) */}
        {activeAmenities(restaurant.amenities).length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
              {locale === 'ko' ? '외국인 편의' : 'Good for visitors'}
            </h3>
            <AmenityBadges amenities={restaurant.amenities} locale={locale} variant="full" />
          </section>
        )}

        {/* 5) 인증 뱃지 + 인증별 metadata (있는 인증만) */}
        <section className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            인증
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {restaurant.verifications.map((v, i) => (
              <VerificationBadge key={`${v.code}-${i}`} verification={v} />
            ))}
          </div>
          <VerificationMetaPanel verifications={restaurant.verifications} />
        </section>

        {/* 6) 연락처 + 주소 */}
        <section className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            연락처
          </h3>
          <div className="flex flex-col gap-1.5 text-sm text-gray-700">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-start gap-1.5 underline-offset-2 hover:underline"
                style={{ color: accent }}
              >
                <span aria-hidden>📞</span>
                {restaurant.phone}
              </a>
            )}
            <p className="flex items-start gap-1.5">
              <span aria-hidden>📍</span>
              {restaurant.addressRoad}
            </p>
          </div>
        </section>

        {/* 7) 영업시간 — 주간 리스트(오늘 강조). 정보 없으면 안내 문구. */}
        <section className="mt-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
            영업시간
          </h3>
          {restaurant.openingHours ? (
            <WeeklyHours hours={restaurant.openingHours} />
          ) : (
            <p className="text-sm text-gray-400">영업시간 정보 없음</p>
          )}
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
