'use client'

import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { RouteSummary, DirectionsErrorKind } from '@/lib/api/directions'
import { displayName, type Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'

/** 출발점 모드: 'first'=코스 첫 집(기본), 'me'=내 위치 */
export type StartMode = 'me' | 'first'

interface Props {
  /** 코스에 담긴 식당 (담은 순서) */
  items: Restaurant[]
  locale: Locale
  onSelect: (id: string) => void
  /** 순서 이동 (from → to) */
  onMove: (from: number, to: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onBack: () => void
  /** 코스 전체 길찾기 */
  routing: boolean
  routeSummary: RouteSummary | null
  /** 길찾기 실패 종류 (null=정상) */
  routeError: DirectionsErrorKind | null
  onRoute: () => void
  /** 출발점 토글 (내 위치 / 코스 첫 집) */
  startMode: StartMode
  onStartModeChange: (mode: StartMode) => void
  /** '내 위치' 였으나 위치 권한이 없어 첫 집으로 폴백한 경우 true */
  startFellBack: boolean
  /** 현재 출발점 모드에서 코스에 담을 수 있는 집 최대치 (경유지 한도) */
  maxHouses: number
  /** 직선거리 기준 순서 최적화 실행 */
  onOptimize: () => void
  /** 최적화 진행 중 */
  optimizing: boolean
  /** 최적화 가능 여부 (집 3곳 이상) */
  canOptimize: boolean
  /** 활성 정류지 id — 지도 핀과 공유. 이 항목을 강조한다 */
  activeStopId: string | null
  /** 항목 hover → 활성 정류지 공유 (목록↔지도 상호 강조). null=해제 */
  onStopHover: (id: string | null) => void
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`)
const fmtDur = (s: number, locale: Locale) =>
  `${Math.round(s / 60)}${t(locale, 'minUnit')}`
const fmtWon = (n: number) => `₩${Math.round(n).toLocaleString('en-US')}`

/**
 * "내 코스" 패널. 담은 순서대로 동선을 보여주고 ↑↓ 재정렬·삭제를 지원한다.
 * 사이드바에서 목록 대신 표시된다(상세 패널보다는 아래 우선순위).
 */
export function CoursePanel({
  items,
  locale,
  onSelect,
  onMove,
  onRemove,
  onClear,
  onBack,
  routing,
  routeSummary,
  routeError,
  onRoute,
  startMode,
  onStartModeChange,
  startFellBack,
  maxHouses,
  onOptimize,
  optimizing,
  canOptimize,
  activeStopId,
  onStopHover,
}: Props) {
  const capped = items.length > maxHouses
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
        >
          <span aria-hidden>←</span> {t(locale, 'back')}
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            {t(locale, 'courseClearAll')}
          </button>
        )}
      </div>

      <div className="px-4 pb-1 pt-3">
        <h2 className="text-lg font-extrabold text-gray-900">
          🧭 {t(locale, 'myCourse')} <span className="text-emerald-600">{items.length}</span>
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">{t(locale, 'courseOrderHint')}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm leading-relaxed text-gray-400">
            {t(locale, 'courseEmpty')}
            <br />
            {t(locale, 'courseEmptyHint')}
          </p>
        ) : (
          items.map((r, i) => {
            const primary = primaryVerification(r)
            const accent = primary ? getVerificationMeta(primary.code).color : '#111827'
            const activeStop = activeStopId === r.id
            return (
              <div
                key={r.id}
                onMouseEnter={() => onStopHover(r.id)}
                onMouseLeave={() => onStopHover(null)}
                className={`flex items-center gap-2 rounded-xl border bg-white p-2.5 transition-colors ${
                  activeStop
                    ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-300'
                    : 'border-gray-100'
                }`}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>

                <button
                  type="button"
                  onClick={() => onSelect(r.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-bold text-gray-900">{displayName(r, locale)}</p>
                  <p className="truncate text-xs text-gray-400">{r.category}</p>
                </button>

                <div className="flex shrink-0 flex-col text-gray-400">
                  <button
                    type="button"
                    onClick={() => onMove(i, i - 1)}
                    disabled={i === 0}
                    aria-label={t(locale, 'moveUp')}
                    className="px-1 leading-none transition-colors hover:text-gray-700 disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(i, i + 1)}
                    disabled={i === items.length - 1}
                    aria-label={t(locale, 'moveDown')}
                    className="px-1 leading-none transition-colors hover:text-gray-700 disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  aria-label={t(locale, 'removeFromCourse')}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* 코스 전체 길찾기 (네이버 Directions 15, 경유지 최대 15) */}
      {items.length >= 2 && (
        <div className="space-y-2 border-t border-gray-100 p-3">
          {/* 출발점 토글 — 기본은 코스 첫 집. '내 위치'는 출발 좌표로만 쓰인다. */}
          <div>
            <p className="mb-1 text-[11px] font-semibold text-gray-400">{t(locale, 'startPoint')}</p>
            <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => onStartModeChange('first')}
                className={`flex-1 rounded-md py-1.5 transition-colors ${
                  startMode === 'first'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t(locale, 'startFirst')}
              </button>
              <button
                type="button"
                onClick={() => onStartModeChange('me')}
                className={`flex-1 rounded-md py-1.5 transition-colors ${
                  startMode === 'me'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                📍 {t(locale, 'startMe')}
              </button>
            </div>
          </div>

          {/* 순서 최적화 — 직선거리 기준 휴리스틱으로 동선을 다듬는다 (도로경로는 길찾기에서). */}
          {canOptimize && (
            <button
              type="button"
              onClick={onOptimize}
              disabled={optimizing || routing}
              className="w-full rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              {optimizing ? t(locale, 'optimizing') : `✨ ${t(locale, 'optimizeOrder')}`}
            </button>
          )}

          {routeSummary && (
            <div className="rounded-lg bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-700">
              {/* 이동수단 명시 — 거리·시간·요금이 '자동차' 기준임을 눈에 띄게 */}
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white">
                🚗 {t(locale, 'carBasis')}
              </span>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span>{t(locale, 'courseTotal')} {fmtDist(routeSummary.distance)}</span>
                <span className="text-gray-300">·</span>
                <span>{fmtDur(routeSummary.duration, locale)}</span>
              </div>
              {(routeSummary.tollFare || routeSummary.fuelPrice) && (
                <div className="mt-0.5 text-[11px] font-medium text-gray-400">
                  {routeSummary.tollFare ? `${t(locale, 'toll')} ${fmtWon(routeSummary.tollFare)}` : ''}
                  {routeSummary.tollFare && routeSummary.fuelPrice ? ' · ' : ''}
                  {routeSummary.fuelPrice ? `${t(locale, 'fuel')} ${fmtWon(routeSummary.fuelPrice)}` : ''}
                </div>
              )}
              <div className="mt-0.5 text-[10px] font-medium text-gray-300">
                {t(locale, 'realtimeRoute')}
              </div>
            </div>
          )}
          {startFellBack && (
            <p className="text-center text-[11px] font-medium text-amber-600">
              {t(locale, 'startFellBack')}
            </p>
          )}
          {routeError === 'notfound' && (
            <p className="text-center text-xs font-medium text-red-500">
              {t(locale, 'routeNotFound')}
            </p>
          )}
          {routeError === 'temporary' && (
            <p className="text-center text-xs font-medium text-red-500">
              {t(locale, 'routeTempError')}
            </p>
          )}
          {capped && (
            <p className="text-center text-[11px] text-gray-400">
              {t(locale, 'waypointLimit').replace('{n}', String(maxHouses))}
            </p>
          )}
          <button
            type="button"
            onClick={onRoute}
            disabled={routing}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {routing ? t(locale, 'directionsLoading') : `🚗 ${t(locale, 'courseRouteCta')}`}
          </button>
        </div>
      )}
    </div>
  )
}
