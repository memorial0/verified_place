import type { LatLng } from '@/lib/api/directions'

/**
 * 코스 방문 순서 최적화 — 좌표만으로 동작하는 순수 모듈 (React/네트워크 무관).
 *
 * 실제 도로 거리는 네이버 Directions 가 알지만, 그건 "이미 정해진 순서"의 경로를
 * 그릴 뿐 순서를 바꿔주진 않는다. 그래서 키와 무관하게, 직선거리(하버사인)를
 * 비용함수로 쓰는 휴리스틱으로 방문 순서를 먼저 다듬는다:
 *   1) 최근접 이웃(nearest-neighbor) 으로 초기 순서 구성
 *   2) 2-opt 으로 교차 구간을 펴서 총 직선거리를 줄임
 * 직선거리는 도로거리의 단조 근사라 순서 품질에 충분하고, 좌표만으로 결정적이라
 * 단위 테스트가 쉽다. 최종 도로거리/경로는 정해진 순서로 Directions 가 채운다.
 */

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180

/** 두 좌표 사이 대권(great-circle) 직선거리 (미터). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** 주어진 순서대로 좌표들을 이은 열린 경로(왕복 아님)의 총 직선거리. */
export function pathLengthMeters(points: LatLng[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineMeters(points[i - 1], points[i])
  return total
}

/**
 * 최근접 이웃: startIdx 에서 출발해 매번 가장 가까운 미방문 점으로 이동하는
 * 인덱스 순열을 만든다. 입력 좌표는 바꾸지 않는다.
 */
export function nearestNeighborOrder(coords: LatLng[], startIdx = 0): number[] {
  const n = coords.length
  if (n <= 1) return coords.map((_, i) => i)
  const visited = new Array<boolean>(n).fill(false)
  const order = [startIdx]
  visited[startIdx] = true
  for (let step = 1; step < n; step++) {
    const from = order[order.length - 1]
    let best = -1
    let bestDist = Infinity
    for (let j = 0; j < n; j++) {
      if (visited[j]) continue
      const d = haversineMeters(coords[from], coords[j])
      if (d < bestDist) {
        bestDist = d
        best = j
      }
    }
    order.push(best)
    visited[best] = true
  }
  return order
}

/**
 * 2-opt: 순서 배열에서 두 구간 경계를 골라 사이를 뒤집어 총거리가 줄면 채택,
 * 더 줄지 않을 때까지 반복한다(국소 최적). 열린 경로 기준.
 * anchorFirst=true 면 order[0](출발점)을 고정해 뒤집기 대상에서 제외한다.
 */
export function twoOptImprove(
  order: number[],
  coords: LatLng[],
  anchorFirst = true,
): number[] {
  const n = order.length
  if (n < 4) return order.slice() // 뒤집어 이득 볼 구간이 없음
  const result = order.slice()
  const dist = (a: number, b: number) => haversineMeters(coords[a], coords[b])
  const lo = anchorFirst ? 1 : 0
  let improved = true
  while (improved) {
    improved = false
    // [i, k] 구간을 뒤집는다. 열린 경로라 마지막 점은 k=n-1 까지 허용.
    for (let i = lo; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const a = result[i - 1] // 뒤집을 구간 바로 앞 (i>=1 보장)
        const b = result[i]
        const c = result[k]
        const d = k + 1 < n ? result[k + 1] : -1
        // 기존: a-b ... c-d  →  교체: a-c ... b-d (사이 구간 역순)
        const before = dist(a, b) + (d === -1 ? 0 : dist(c, d))
        const after = dist(a, c) + (d === -1 ? 0 : dist(b, d))
        if (after + 1e-9 < before) {
          let x = i
          let y = k
          while (x < y) {
            const t = result[x]
            result[x] = result[y]
            result[y] = t
            x++
            y--
          }
          improved = true
        }
      }
    }
  }
  return result
}

export interface OptimizeOptions {
  /**
   * 별도 출발 좌표(예: 내 위치). 주면 이 점에서 가장 가까운 항목부터 방문하도록
   * 순서를 정한다. start 자체는 결과 배열에 포함되지 않는다(코스 항목이 아님).
   */
  start?: LatLng
  /**
   * start 가 없을 때 items[0]을 출발점으로 고정할지. 기본 true('코스 첫 집' 모드:
   * 첫 집은 그대로 두고 나머지 방문 순서만 다듬는다).
   */
  keepFirst?: boolean
}

/**
 * 코스 항목을 직선거리 기준으로 더 짧은 동선이 되도록 재정렬해 새 배열로 반환한다.
 * 좌표 접근은 coordOf 로 주입 → Restaurant 든 순수 좌표든 동일 로직으로 검증 가능.
 * 원본 배열·항목은 변형하지 않는다. 2개 이하이면 순서가 의미 없어 그대로 복사 반환.
 */
export function optimizeCourseOrder<T>(
  items: T[],
  coordOf: (item: T) => LatLng,
  opts: OptimizeOptions = {},
): T[] {
  const { start, keepFirst = true } = opts
  if (items.length <= 2) return items.slice()

  const coords = items.map(coordOf)

  if (start) {
    // 가상 출발점을 0번에 끼워 NN→2-opt 후 제거. 출발점은 고정(anchorFirst).
    const withStart = [start, ...coords]
    const nn = nearestNeighborOrder(withStart, 0)
    const opt = twoOptImprove(nn, withStart, true)
    return opt
      .filter((idx) => idx !== 0) // 가상 출발점 제거
      .map((idx) => items[idx - 1]) // withStart 인덱스 → items 인덱스 보정
  }

  const nn = nearestNeighborOrder(coords, 0)
  const opt = twoOptImprove(nn, coords, keepFirst)
  return opt.map((idx) => items[idx])
}
