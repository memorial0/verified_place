import { NextRequest, NextResponse } from 'next/server'

// 네이버 Directions 5 는 NCP API Gateway 키(서버 시크릿)로 호출 → Edge 런타임
export const runtime = 'edge'

/**
 * GET /api/directions?origin=lng,lat&destination=lng,lat[&waypoints=lng,lat|lng,lat]
 * 네이버 Directions 5 자동차 길찾기 → 경로 좌표(path) + 요약(거리/시간/택시요금) 반환.
 * waypoints(경유지, 최대 5)를 주면 코스 전체를 한 번에 잇는 경로를 반환한다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const waypoints = searchParams.get('waypoints') // "lng,lat|lng,lat" (최대 5)
  if (!origin || !destination) {
    return NextResponse.json({ error: 'origin/destination 필요' }, { status: 400 })
  }

  // JS SDK 와 동일한 NCP Maps 애플리케이션 자격증명 (Client ID + Secret)
  const keyId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID
  const keySecret = process.env.NAVER_CLIENT_SECRET
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: '네이버 지도 키 미설정' }, { status: 500 })
  }

  // start/goal 모두 "경도,위도(lng,lat)" 포맷. option=traoptimal: 실시간 최적 경로
  let url =
    'https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving' +
    `?start=${encodeURIComponent(origin)}&goal=${encodeURIComponent(destination)}&option=traoptimal`
  // 경유지: 네이버는 '|' 구분, 최대 5개
  if (waypoints) {
    const vias = waypoints.split('|').slice(0, 5).join('|')
    url += `&waypoints=${encodeURIComponent(vias)}`
  }

  const res = await fetch(url, {
    headers: {
      'x-ncp-apigw-api-key-id': keyId,
      'x-ncp-apigw-api-key': keySecret,
    },
  })
  if (!res.ok) {
    return NextResponse.json({ error: `naver ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  // code 0 = 성공. 그 외엔 message 에 사유(경로 없음, 출도착 동일 등)
  if (data.code !== 0) {
    return NextResponse.json(
      { error: data.message ?? '경로를 찾지 못했습니다' },
      { status: 422 },
    )
  }

  const route = data.route?.traoptimal?.[0]
  if (!route) {
    return NextResponse.json({ error: '경로를 찾지 못했습니다' }, { status: 422 })
  }

  // path: [[lng,lat], ...] → {lat,lng}[]
  const path: { lat: number; lng: number }[] = (route.path ?? []).map(
    ([lng, lat]: [number, number]) => ({ lat, lng }),
  )

  return NextResponse.json({
    summary: {
      distance: route.summary.distance, // m
      duration: Math.round(route.summary.duration / 1000), // 네이버는 ms → s 로 변환
      taxiFare: route.summary.taxiFare,
    },
    path,
  })
}
