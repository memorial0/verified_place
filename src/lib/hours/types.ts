/**
 * 영업시간 도메인 타입.
 *
 * 포맷 규칙 (DB restaurants.opening_hours jsonb 와 동일):
 *   - 요일별 Range 배열. 빈 배열([]) = 그날 휴무.
 *   - 시각은 "HH:MM" 24시간 표기.
 *   - close <= open 이면 익일까지 영업(자정 넘김). 예: { open:"18:00", close:"02:00" }.
 *   - "24:00" 은 자정(그날의 끝). { open:"00:00", close:"24:00" } = 24시간 영업.
 *   - 컬럼 전체가 null = 영업시간 정보 없음(미수집/미매칭).
 */

export type Range = { open: string; close: string }

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type OpeningHours = Record<DayKey, Range[]> | null

export type OpenStatus =
  | { status: 'unknown' }
  | { status: 'open'; until?: string }
  | { status: 'closed'; nextOpen?: { dayLabel: string; time: string } }
