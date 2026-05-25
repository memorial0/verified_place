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
