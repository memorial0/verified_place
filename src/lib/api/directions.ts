export interface LatLng {
  lat: number
  lng: number
}

export interface RouteSummary {
  distance: number // m
  duration: number // s
  taxiFare?: number
}

export interface DirectionsResult {
  path: LatLng[]
  summary: RouteSummary
}

/** 브라우저 현재 위치 (Promise 래핑). HTTPS 또는 localhost에서만 동작. */
export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation 미지원'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000, enableHighAccuracy: false },
    )
  })
}

/** 출발→도착 자동차 경로 조회 (서버 /api/directions 경유). */
export async function fetchDirections(
  origin: LatLng,
  destination: LatLng,
): Promise<DirectionsResult> {
  const res = await fetch(
    `/api/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`,
  )
  if (!res.ok) throw new Error(`directions ${res.status}`)
  return res.json()
}

/**
 * 여러 지점을 순서대로 잇는 자동차 경로 (코스 전체 길찾기).
 * points[0]=출발, points[last]=도착, 중간은 경유지(네이버 최대 5 → 총 7지점).
 */
export async function fetchRouteThrough(points: LatLng[]): Promise<DirectionsResult> {
  if (points.length < 2) throw new Error('경로에는 2지점 이상 필요')
  const fmt = (p: LatLng) => `${p.lng},${p.lat}`
  const params = new URLSearchParams({
    origin: fmt(points[0]),
    destination: fmt(points[points.length - 1]),
  })
  const vias = points.slice(1, -1)
  if (vias.length > 0) params.set('waypoints', vias.map(fmt).join('|'))

  const res = await fetch(`/api/directions?${params.toString()}`)
  if (!res.ok) throw new Error(`directions ${res.status}`)
  return res.json()
}
