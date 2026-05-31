'use client'

import { useEffect, useState } from 'react'
import { getOpenStatus } from '@/lib/hours'
import type { OpeningHours, OpenStatus } from '@/lib/hours/types'

/**
 * 현재 영업 상태 뱃지.
 *
 * ⚠️ 현재시각(Asia/Seoul) 의존이라 SSR 결과와 클라이언트가 어긋날 수 있다(hydration mismatch).
 *    → 마운트 전에는 아무것도 렌더하지 않고, 마운트 후 클라이언트에서만 계산한다.
 *      (서버/첫 렌더 모두 null → 일치, 이후 effect 로 채움)
 */
export function OpenStatusBadge({
  hours,
  className = '',
}: {
  hours: OpeningHours
  className?: string
}) {
  const [status, setStatus] = useState<OpenStatus | null>(null)

  useEffect(() => {
    setStatus(getOpenStatus(hours, new Date()))
  }, [hours])

  // 마운트 전 / 정보 없음(unknown) → 뱃지 숨김
  if (!status || status.status === 'unknown') return null

  const base = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${className}`

  if (status.status === 'open') {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700`}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        영업 중{status.until ? ` · ${status.until} 마감` : ''}
      </span>
    )
  }

  return (
    <span className={`${base} bg-gray-100 text-gray-500`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      영업 종료
      {status.nextOpen ? ` · ${status.nextOpen.dayLabel} ${status.nextOpen.time} 오픈` : ''}
    </span>
  )
}
