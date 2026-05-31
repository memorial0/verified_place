import { describe, it, expect } from 'vitest'
import { getOpenStatus, formatDay, formatWeekly, getTodayKey } from './index'
import type { OpeningHours } from './types'

// 기준 주: 2024-06-03(월)~06-09(일). 서울 = UTC+9.
// 헬퍼: 서울 벽시계 → UTC Date.  seoul('2024-06-04T12:00') = 화 12:00 KST
const seoul = (utcMinus9: string) => {
  // 인자로 받은 'YYYY-MM-DDTHH:MM' 를 KST 로 보고 UTC 로 환산(−9h)해 Date 생성.
  const [date, time] = utcMinus9.split('T')
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi))
}

const open9to21: OpeningHours = {
  mon: [{ open: '09:00', close: '21:00' }],
  tue: [{ open: '09:00', close: '21:00' }],
  wed: [{ open: '09:00', close: '21:00' }],
  thu: [{ open: '09:00', close: '21:00' }],
  fri: [{ open: '09:00', close: '21:00' }],
  sat: [{ open: '09:00', close: '21:00' }],
  sun: [],
}

describe('getOpenStatus — 일반', () => {
  it('영업시간 내면 open + 마감시각', () => {
    const s = getOpenStatus(open9to21, seoul('2024-06-04T12:00')) // 화 12:00
    expect(s).toEqual({ status: 'open', until: '21:00' })
  })

  it('오픈 정각은 영업 중(경계 포함)', () => {
    const s = getOpenStatus(open9to21, seoul('2024-06-04T09:00'))
    expect(s.status).toBe('open')
  })

  it('마감 정각은 영업 종료(경계 제외)', () => {
    const s = getOpenStatus(open9to21, seoul('2024-06-04T21:00'))
    expect(s.status).toBe('closed')
  })

  it('영업 전이면 closed + 오늘 오픈 안내', () => {
    const s = getOpenStatus(open9to21, seoul('2024-06-04T08:00'))
    expect(s).toEqual({ status: 'closed', nextOpen: { dayLabel: '오늘', time: '09:00' } })
  })
})

describe('getOpenStatus — 브레이크타임', () => {
  const breakDay: OpeningHours = {
    ...open9to21,
    tue: [
      { open: '11:00', close: '15:00' },
      { open: '17:00', close: '21:00' },
    ],
  }
  it('첫 구간 내면 open(첫 구간 마감)', () => {
    expect(getOpenStatus(breakDay, seoul('2024-06-04T12:00'))).toEqual({
      status: 'open',
      until: '15:00',
    })
  })
  it('브레이크 중이면 closed + 같은 날 다음 구간 오픈', () => {
    expect(getOpenStatus(breakDay, seoul('2024-06-04T16:00'))).toEqual({
      status: 'closed',
      nextOpen: { dayLabel: '오늘', time: '17:00' },
    })
  })
  it('둘째 구간 내면 open(둘째 구간 마감)', () => {
    expect(getOpenStatus(breakDay, seoul('2024-06-04T18:00'))).toEqual({
      status: 'open',
      until: '21:00',
    })
  })
})

describe('getOpenStatus — 익일 마감(자정 넘김)', () => {
  const overnight: OpeningHours = {
    ...open9to21,
    fri: [{ open: '18:00', close: '02:00' }],
    sat: [],
  }
  it('금 23:00 영업 중(익일 02:00 마감)', () => {
    expect(getOpenStatus(overnight, seoul('2024-06-07T23:00'))).toEqual({
      status: 'open',
      until: '02:00',
    })
  })
  it('토 01:00 은 어제(금) 영업이 넘어와 영업 중', () => {
    expect(getOpenStatus(overnight, seoul('2024-06-08T01:00'))).toEqual({
      status: 'open',
      until: '02:00',
    })
  })
  it('토 02:00 정각은 종료(경계 제외)', () => {
    expect(getOpenStatus(overnight, seoul('2024-06-08T02:00')).status).toBe('closed')
  })
})

describe('getOpenStatus — 24시간', () => {
  const allDay: OpeningHours = { ...open9to21, mon: [{ open: '00:00', close: '24:00' }] }
  it('언제나 open, 마감(until) 없음', () => {
    const s = getOpenStatus(allDay, seoul('2024-06-03T03:00')) // 월 03:00
    expect(s).toEqual({ status: 'open' })
  })
})

describe('getOpenStatus — 휴무 / null', () => {
  it('휴무일은 closed + 다음 영업일 안내', () => {
    const s = getOpenStatus(open9to21, seoul('2024-06-09T12:00')) // 일(휴무)
    expect(s).toEqual({ status: 'closed', nextOpen: { dayLabel: '내일', time: '09:00' } })
  })
  it('null 이면 unknown', () => {
    expect(getOpenStatus(null, seoul('2024-06-04T12:00'))).toEqual({ status: 'unknown' })
  })
})

describe('getOpenStatus — 자정 경계', () => {
  const tillMidnight: OpeningHours = { ...open9to21, mon: [{ open: '09:00', close: '24:00' }] }
  it('23:59 은 영업 중(24:00 마감)', () => {
    expect(getOpenStatus(tillMidnight, seoul('2024-06-03T23:59'))).toEqual({
      status: 'open',
      until: '24:00',
    })
  })
})

describe('formatDay / formatWeekly', () => {
  it('일반 구간', () => {
    expect(formatDay([{ open: '09:00', close: '21:00' }])).toBe('09:00–21:00')
  })
  it('브레이크타임은 두 구간', () => {
    expect(
      formatDay([
        { open: '11:00', close: '15:00' },
        { open: '17:00', close: '21:00' },
      ]),
    ).toBe('11:00–15:00, 17:00–21:00')
  })
  it('익일 마감 구간 그대로 표기', () => {
    expect(formatDay([{ open: '18:00', close: '02:00' }])).toBe('18:00–02:00')
  })
  it('빈 배열은 휴무', () => {
    expect(formatDay([])).toBe('휴무')
  })
  it('24시간', () => {
    expect(formatDay([{ open: '00:00', close: '24:00' }])).toBe('24시간')
  })
  it('formatWeekly 는 월요일 시작 7개', () => {
    const w = formatWeekly(open9to21)
    expect(w.map((d) => d.key)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    expect(w[0]).toEqual({ key: 'mon', label: '월', text: '09:00–21:00' })
    expect(w[6]).toEqual({ key: 'sun', label: '일', text: '휴무' })
  })
  it('null 이면 전부 휴무로 표기', () => {
    expect(formatWeekly(null).every((d) => d.text === '휴무')).toBe(true)
  })
})

describe('getTodayKey', () => {
  it('서울 요일 키 반환', () => {
    expect(getTodayKey(seoul('2024-06-04T12:00'))).toBe('tue')
    expect(getTodayKey(seoul('2024-06-09T12:00'))).toBe('sun')
  })
})
