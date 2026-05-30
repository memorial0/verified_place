import { describe, it, expect } from 'vitest'
import type { LatLng } from '@/lib/api/directions'
import {
  haversineMeters,
  pathLengthMeters,
  nearestNeighborOrder,
  twoOptImprove,
  optimizeCourseOrder,
} from './order'

// 모든 테스트는 좌표만으로 결정적이다 (네이버 키·네트워크 불필요).
// 위도 고정·경도만 바꾸면 거리가 경도차에 단조 비례 → 순서를 정확히 예측할 수 있다.
const LAT = 37.5
const at = (lng: number, lat = LAT): LatLng => ({ lat, lng })
/** 항목을 경도 라벨 배열로 (순서 검증용) */
const lngs = (items: LatLng[]) => items.map((p) => p.lng)

describe('haversineMeters', () => {
  it('같은 점은 0', () => {
    expect(haversineMeters(at(0), at(0))).toBe(0)
    expect(haversineMeters(at(127.1, 37.5), at(127.1, 37.5))).toBe(0)
  })

  it('위도 1도 ≈ 111.2km (±0.5km)', () => {
    const d = haversineMeters({ lat: 37, lng: 127 }, { lat: 38, lng: 127 })
    expect(d).toBeGreaterThan(111_000)
    expect(d).toBeLessThan(111_700)
  })

  it('대칭이다', () => {
    const a = { lat: 37.5, lng: 127.0 }
    const b = { lat: 37.6, lng: 127.2 }
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6)
  })
})

describe('pathLengthMeters', () => {
  it('0~1개 점이면 0', () => {
    expect(pathLengthMeters([])).toBe(0)
    expect(pathLengthMeters([at(0)])).toBe(0)
  })

  it('구간 합과 같다', () => {
    const pts = [at(0), at(1), at(3)]
    const expected = haversineMeters(pts[0], pts[1]) + haversineMeters(pts[1], pts[2])
    expect(pathLengthMeters(pts)).toBeCloseTo(expected, 6)
  })
})

describe('nearestNeighborOrder', () => {
  it('직선 위 점들은 출발점에서 가까운 순으로 정렬', () => {
    // 경도 [0,2,4,1,3] — 0에서 출발하면 가장 가까운 순서는 0,1,2,3,4
    const coords = [at(0), at(2), at(4), at(1), at(3)]
    const order = nearestNeighborOrder(coords, 0)
    expect(lngs(order.map((i) => coords[i]))).toEqual([0, 1, 2, 3, 4])
  })

  it('출발 인덱스를 존중한다', () => {
    const coords = [at(0), at(2), at(4), at(1), at(3)]
    const order = nearestNeighborOrder(coords, 2) // 경도4에서 출발
    expect(order[0]).toBe(2)
    expect(lngs(order.map((i) => coords[i]))).toEqual([4, 3, 2, 1, 0])
  })

  it('0~1개 점은 그대로', () => {
    expect(nearestNeighborOrder([], 0)).toEqual([])
    expect(nearestNeighborOrder([at(5)], 0)).toEqual([0])
  })
})

describe('twoOptImprove', () => {
  it('교차하는 경로를 펴서 더 짧게 만든다', () => {
    // 2×2 정사각형 모서리. 0을 출발로 고정한 채 0→3→2→1(교차)을 풀면 더 짧아진다.
    const coords = [at(0, 0), at(0, 2), at(2, 0), at(2, 2)]
    const bad = [0, 3, 2, 1]
    const before = pathLengthMeters(bad.map((i) => coords[i]))
    const opt = twoOptImprove(bad, coords, true)
    const after = pathLengthMeters(opt.map((i) => coords[i]))
    expect(after).toBeLessThan(before)
    expect(opt[0]).toBe(0) // 출발점 고정
  })

  it('이미 최적인 경로는 그대로 둔다', () => {
    const coords = [at(0), at(1), at(2), at(3)]
    expect(twoOptImprove([0, 1, 2, 3], coords, true)).toEqual([0, 1, 2, 3])
  })

  it('4개 미만이면 원본 복사본을 반환(변형 없음)', () => {
    const order = [0, 1, 2]
    const out = twoOptImprove(order, [at(0), at(2), at(1)], true)
    expect(out).toEqual([0, 1, 2])
    expect(out).not.toBe(order)
  })
})

describe('optimizeCourseOrder', () => {
  const coordOf = (p: LatLng) => p

  it("'코스 첫 집' 모드: 첫 항목을 고정하고 나머지를 더 짧게 재정렬", () => {
    const items = [at(0), at(2), at(4), at(1), at(3)]
    const out = optimizeCourseOrder(items, coordOf) // keepFirst 기본 true
    expect(out[0]).toBe(items[0]) // 첫 집 고정
    expect(lngs(out)).toEqual([0, 1, 2, 3, 4])
    expect(pathLengthMeters(out)).toBeLessThan(pathLengthMeters(items))
  })

  it('start(내 위치) 모드: 출발 좌표에서 가까운 순서로, start 는 결과에서 제외', () => {
    const items = [at(5), at(1), at(3)]
    const out = optimizeCourseOrder(items, coordOf, { start: at(0) })
    expect(out).toHaveLength(3) // start 미포함
    expect(lngs(out)).toEqual([1, 3, 5])
  })

  it('2개 이하는 순서 의미가 없어 복사본 그대로 반환', () => {
    const one = [at(0)]
    const two = [at(9), at(1)]
    expect(optimizeCourseOrder(one, coordOf)).toEqual(one)
    expect(optimizeCourseOrder(two, coordOf)).toEqual(two)
    expect(optimizeCourseOrder(two, coordOf)).not.toBe(two) // 새 배열
  })

  it('원본 배열·항목을 변형하지 않는다', () => {
    const items = [at(0), at(4), at(2), at(1), at(3)]
    const snapshot = lngs(items)
    optimizeCourseOrder(items, coordOf)
    expect(lngs(items)).toEqual(snapshot)
  })

  it('임의 객체에도 동작 (coordOf 주입)', () => {
    type House = { id: string; loc: LatLng }
    const houses: House[] = [
      { id: 'a', loc: at(0) },
      { id: 'b', loc: at(4) },
      { id: 'c', loc: at(2) },
      { id: 'd', loc: at(1) },
    ]
    const out = optimizeCourseOrder(houses, (h) => h.loc)
    expect(out.map((h) => h.id)).toEqual(['a', 'd', 'c', 'b'])
  })
})
