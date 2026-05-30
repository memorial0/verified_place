'use client'

import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { RouteSummary } from '@/lib/api/directions'
import { displayName, type Locale } from '@/lib/i18n/display'

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
  routeError: boolean
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
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`)
const fmtDur = (s: number) => `${Math.round(s / 60)}분`
const fmtWon = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`

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
          <span aria-hidden>←</span> 목록으로
        </button>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            전체 비우기
          </button>
        )}
      </div>

      <div className="px-4 pb-1 pt-3">
        <h2 className="text-lg font-extrabold text-gray-900">
          🧭 내 코스 <span className="text-emerald-600">{items.length}곳</span>
        </h2>
        <p className="mt-0.5 text-xs text-gray-400">
          담은 순서가 동선이 됩니다. ↑↓로 순서를 바꿔보세요.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm leading-relaxed text-gray-400">
            코스가 비어 있습니다.
            <br />
            지도 마커를 눌러 <span className="font-semibold text-emerald-600">
              🧭 코스에 추가
            </span>
            해 보세요.
          </p>
        ) : (
          items.map((r, i) => {
            const primary = primaryVerification(r)
            const accent = primary ? getVerificationMeta(primary.code).color : '#111827'
            return (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-2.5"
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
                    aria-label="위로"
                    className="px-1 leading-none transition-colors hover:text-gray-700 disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(i, i + 1)}
                    disabled={i === items.length - 1}
                    aria-label="아래로"
                    className="px-1 leading-none transition-colors hover:text-gray-700 disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(r.id)}
                  aria-label="코스에서 삭제"
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
            <p className="mb-1 text-[11px] font-semibold text-gray-400">출발점</p>
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
                코스 첫 집
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
                📍 내 위치
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
              {optimizing ? '순서 계산 중…' : '✨ 가까운 순서로 정렬'}
            </button>
          )}

          {routeSummary && (
            <div className="rounded-lg bg-gray-50 px-2 py-1.5 text-center text-xs font-semibold text-gray-700">
              <div className="flex items-center justify-center gap-2">
                <span aria-hidden>🚗</span>
                <span>코스 전체 {fmtDist(routeSummary.distance)}</span>
                <span className="text-gray-300">·</span>
                <span>{fmtDur(routeSummary.duration)}</span>
              </div>
              {(routeSummary.tollFare || routeSummary.fuelPrice) && (
                <div className="mt-0.5 text-[11px] font-medium text-gray-400">
                  {routeSummary.tollFare ? `통행료 ${fmtWon(routeSummary.tollFare)}` : ''}
                  {routeSummary.tollFare && routeSummary.fuelPrice ? ' · ' : ''}
                  {routeSummary.fuelPrice ? `유류비 ${fmtWon(routeSummary.fuelPrice)}` : ''}
                </div>
              )}
              <div className="mt-0.5 text-[10px] font-medium text-gray-300">
                자동차 기준 (실시간 최적 경로)
              </div>
            </div>
          )}
          {startFellBack && (
            <p className="text-center text-[11px] font-medium text-amber-600">
              위치 권한이 없어 첫 집을 출발점으로 사용합니다.
            </p>
          )}
          {routeError && (
            <p className="text-center text-xs font-medium text-red-500">
              경로를 찾지 못했습니다. 지점이 너무 멀거나 도로가 없을 수 있어요.
            </p>
          )}
          {capped && (
            <p className="text-center text-[11px] text-gray-400">
              경유지 한도로 앞 {maxHouses}곳까지만 경로를 표시합니다.
            </p>
          )}
          <button
            type="button"
            onClick={onRoute}
            disabled={routing}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {routing ? '경로 찾는 중…' : '🚗 코스 전체 길찾기 (자동차)'}
          </button>
        </div>
      )}
    </div>
  )
}
