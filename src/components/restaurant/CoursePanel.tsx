'use client'

import {
  VERIFICATION_META,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { RouteSummary } from '@/lib/api/directions'

/** 네이버 경유지 한도(5) → 출발+경유5+도착 = 총 7지점 */
const MAX_COURSE_POINTS = 7

interface Props {
  /** 코스에 담긴 식당 (담은 순서) */
  items: Restaurant[]
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
}

const fmtDist = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`)
const fmtDur = (s: number) => `${Math.round(s / 60)}분`

/**
 * "내 코스" 패널. 담은 순서대로 동선을 보여주고 ↑↓ 재정렬·삭제를 지원한다.
 * 사이드바에서 목록 대신 표시된다(상세 패널보다는 아래 우선순위).
 */
export function CoursePanel({
  items,
  onSelect,
  onMove,
  onRemove,
  onClear,
  onBack,
  routing,
  routeSummary,
  routeError,
  onRoute,
}: Props) {
  const capped = items.length > MAX_COURSE_POINTS
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

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
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
            const accent = primary ? VERIFICATION_META[primary.code].color : '#111827'
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
                  <p className="truncate text-sm font-bold text-gray-900">{r.name}</p>
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

      {/* 코스 전체 길찾기 (네이버 waypoints, 최대 7지점) */}
      {items.length >= 2 && (
        <div className="border-t border-gray-100 p-3">
          {routeSummary && (
            <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-gray-50 py-1.5 text-xs font-semibold text-gray-700">
              <span aria-hidden>🚗</span>
              <span>코스 전체 {fmtDist(routeSummary.distance)}</span>
              <span className="text-gray-300">·</span>
              <span>{fmtDur(routeSummary.duration)}</span>
            </div>
          )}
          {routeError && (
            <p className="mb-2 text-center text-xs font-medium text-red-500">
              경로를 찾지 못했습니다. 지점이 너무 멀거나 도로가 없을 수 있어요.
            </p>
          )}
          {capped && (
            <p className="mb-2 text-center text-[11px] text-gray-400">
              경유지 한도로 앞 {MAX_COURSE_POINTS}곳까지만 경로를 표시합니다.
            </p>
          )}
          <button
            type="button"
            onClick={onRoute}
            disabled={routing}
            className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {routing ? '경로 찾는 중…' : '🚗 코스 전체 길찾기'}
          </button>
        </div>
      )}
    </div>
  )
}
