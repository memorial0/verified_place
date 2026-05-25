import { NextRequest, NextResponse } from 'next/server'

// 카카오 Mobility 길찾기는 REST 키(서버 시크릿)로 호출 → Edge 런타임
export const runtime = 'edge'

/**
 * GET /api/directions?origin=lng,lat&destination=lng,lat
 * 카카오모빌리티 자동차 길찾기 → 경로 좌표(path) + 요약(거리/시간/택시요금) 반환.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin/destination 필요' }, { status: 400 })
  }

  const key = process.env.KAKAO_REST_KEY
  if (!key) {
    return NextResponse.json({ error: 'KAKAO_REST_KEY 미설정' }, { status: 500 })
  }

  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}`

  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) {
    return NextResponse.json({ error: `kakao ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const route = data.routes?.[0]
  if (!route || route.result_code !== 0) {
    return NextResponse.json(
      { error: route?.result_msg ?? '경로를 찾지 못했습니다' },
      { status: 422 },
    )
  }

  // sections[].roads[].vertexes(평면 [lng,lat,...]) → {lat,lng}[]
  const path: { lat: number; lng: number }[] = []
  for (const section of route.sections ?? []) {
    for (const road of section.roads ?? []) {
      const v: number[] = road.vertexes ?? []
      for (let i = 0; i + 1 < v.length; i += 2) {
        path.push({ lng: v[i], lat: v[i + 1] })
      }
    }
  }

  return NextResponse.json({
    summary: {
      distance: route.summary.distance, // m
      duration: route.summary.duration, // s
      taxiFare: route.summary.fare?.taxi,
    },
    path,
  })
}
