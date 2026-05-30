'use client'

import { useEffect, useState } from 'react'
import { formatWeekly, getTodayKey } from '@/lib/hours'
import type { DayKey, OpeningHours } from '@/lib/hours/types'

/**
 * 주간 영업시간 리스트.
 *
 * 표시 문자열(formatWeekly)은 정적이라 SSR 로 그대로 렌더한다(SEO 무관).
 * 단 "오늘 강조"는 현재 날짜(Asia/Seoul) 의존이라, mismatch 방지를 위해 마운트 후
 * 클라이언트에서만 적용한다(첫 렌더는 강조 없음).
 */
export function WeeklyHours({ hours }: { hours: OpeningHours }) {
  const [todayKey, setTodayKey] = useState<DayKey | null>(null)

  useEffect(() => {
    setTodayKey(getTodayKey(new Date()))
  }, [])

  const rows = formatWeekly(hours)

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {rows.map((d) => {
        const isToday = d.key === todayKey
        const isClosed = d.text === '휴무'
        return (
          <li
            key={d.key}
            className={`flex items-center justify-between rounded-md px-2 py-1 ${
              isToday ? 'bg-gray-50 font-bold text-gray-900' : 'text-gray-600'
            }`}
          >
            <span className="w-8 shrink-0">{d.label}</span>
            <span className={`flex-1 text-right ${isClosed && !isToday ? 'text-gray-400' : ''}`}>
              {d.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
