/**
 * 영업시간 계산/표시 유틸.
 *
 * 시간대는 Asia/Seoul 고정(식당이 한국). 현재 영업 여부는 호출 시 넘긴 now(Date)를
 * Intl 로 서울 벽시계(요일+분)로 변환해 판정한다 → 실행 환경 TZ 와 무관하게 동작.
 *
 * 처리 케이스: 오늘 구간 / 어제 익일영업이 오늘로 넘어온 경우 / 브레이크타임(구간 2개) /
 *            24시간 / 휴무([]) / null(→ unknown) / 자정 경계.
 */

import type { DayKey, OpeningHours, OpenStatus, Range } from './types'

// dayIdx: 0=일 … 6=토 (JS Date.getDay 규약과 동일)
const KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const WD_TO_IDX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}
const WEEKDAY_FULL_KO: Record<DayKey, string> = {
  mon: '월요일',
  tue: '화요일',
  wed: '수요일',
  thu: '목요일',
  fri: '금요일',
  sat: '토요일',
  sun: '일요일',
}
const WEEKDAY_SHORT_KO: Record<DayKey, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
}
// 주간 표시는 월요일 시작(국내 관습).
const WEEK_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** "HH:MM" → 자정 기준 분. "24:00" → 1440. */
function toMin(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10))
  return (h || 0) * 60 + (m || 0)
}

/** now(Date) 를 Asia/Seoul 벽시계로: { dayIdx 0~6, nowMin 0~1439 }. */
function seoulNow(now: Date): { dayIdx: number; nowMin: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const dayIdx = WD_TO_IDX[get('weekday')] ?? 0
  const hour = parseInt(get('hour'), 10) % 24 // 일부 환경에서 자정을 '24' 로 줄 수 있음
  const minute = parseInt(get('minute'), 10)
  return { dayIdx, nowMin: hour * 60 + minute }
}

/** 24시간 영업 구간인지: 단일 구간이 하루 전체를 덮는 경우. */
function isAllDay(ranges: Range[]): boolean {
  return (
    ranges.length === 1 &&
    ranges[0].open === '00:00' &&
    (ranges[0].close === '24:00' || ranges[0].close === '00:00')
  )
}

/** 마감 표시값. 24시간이면 마감 개념이 없어 undefined. */
function untilFor(r: Range): string | undefined {
  if (r.open === '00:00' && (r.close === '24:00' || r.close === '00:00')) return undefined
  return r.close
}

function dayRanges(hours: NonNullable<OpeningHours>, idx: number): Range[] {
  return hours[KEYS[idx]] ?? []
}

/** 닫혀 있을 때 다음 오픈을 찾는다(오늘 남은 구간 → 이후 요일, 최대 7일). */
function findNextOpen(
  hours: NonNullable<OpeningHours>,
  dayIdx: number,
  nowMin: number,
): { dayLabel: string; time: string } | null {
  for (let off = 0; off <= 7; off++) {
    const idx = (dayIdx + off) % 7
    const ranges = [...dayRanges(hours, idx)].sort((a, b) => toMin(a.open) - toMin(b.open))
    for (const r of ranges) {
      // 오늘은 이미 지난(또는 진행 중이었던) 구간은 건너뛴다.
      if (off === 0 && toMin(r.open) <= nowMin) continue
      const dayLabel = off === 0 ? '오늘' : off === 1 ? '내일' : WEEKDAY_FULL_KO[KEYS[idx]]
      return { dayLabel, time: r.open }
    }
  }
  return null
}

/**
 * 현재 영업 상태. now 기본값은 호출 시점(클라이언트에서 마운트 후 호출 권장 — hydration 안전).
 */
export function getOpenStatus(hours: OpeningHours, now: Date = new Date()): OpenStatus {
  if (!hours) return { status: 'unknown' }
  const { dayIdx, nowMin } = seoulNow(now)

  // 1) 오늘 구간
  for (const r of dayRanges(hours, dayIdx)) {
    const o = toMin(r.open)
    const c = toMin(r.close)
    if (c > o) {
      // 같은 날 마감(24:00 포함)
      if (nowMin >= o && nowMin < c) return { status: 'open', until: untilFor(r) }
    } else {
      // 익일 마감(자정 넘김): 오픈 이후면 영업 중
      if (nowMin >= o) return { status: 'open', until: untilFor(r) }
    }
  }

  // 2) 어제 익일영업이 오늘 새벽으로 넘어온 경우
  for (const r of dayRanges(hours, (dayIdx + 6) % 7)) {
    const o = toMin(r.open)
    const c = toMin(r.close)
    if (c <= o && nowMin < c) return { status: 'open', until: untilFor(r) }
  }

  // 3) 닫힘 → 다음 오픈
  const nextOpen = findNextOpen(hours, dayIdx, nowMin)
  return nextOpen ? { status: 'closed', nextOpen } : { status: 'closed' }
}

/** 한 요일의 표시 문자열. 휴무 / "24시간" / "11:00–15:00, 17:00–21:00". */
export function formatDay(ranges: Range[] | undefined): string {
  if (!ranges || ranges.length === 0) return '휴무'
  if (isAllDay(ranges)) return '24시간'
  return ranges.map((r) => `${r.open}–${r.close}`).join(', ')
}

/** 주간 영업시간 — 월요일 시작 순서의 표시용 배열. */
export function formatWeekly(
  hours: OpeningHours,
): Array<{ key: DayKey; label: string; text: string }> {
  return WEEK_ORDER.map((key) => ({
    key,
    label: WEEKDAY_SHORT_KO[key],
    text: formatDay(hours?.[key]),
  }))
}

/** 오늘(Asia/Seoul) 요일 키 — 주간 리스트의 오늘 강조용. */
export function getTodayKey(now: Date = new Date()): DayKey {
  return KEYS[seoulNow(now).dayIdx]
}
