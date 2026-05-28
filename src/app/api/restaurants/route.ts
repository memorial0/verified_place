import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cloudflare Pages(next-on-pages)에서 서버 라우트는 Edge 런타임이어야 함
export const runtime = 'edge'

/**
 * GET /api/restaurants
 *
 * Query params:
 *   - category     : 카테고리 slug (예: 'fine_dining')
 *   - verification : 검증유형 code (예: 'michelin') → 해당 인증 "보유" 식당만
 *   - lat, lng     : 좌표가 있으면 반경 검색(RPC) 사용
 *   - radius       : 반경(m), 기본 2000
 *   - limit        : 최대 결과 수, 기본 50
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const category = searchParams.get('category')
  const verification = searchParams.get('verification')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = Number(searchParams.get('radius') ?? 2000)
  // 124행(2026-05) → 500은 한동안 여유. 검증/지역 필터링은 클라이언트에서 수행하므로
  // 서버는 전체를 한 번에 돌려준다. 500+ 도달 시 region 을 DB 쿼리로 푸시할 것.
  const limit = Number(searchParams.get('limit') ?? 500)

  // 좌표가 주어지면 PostGIS 반경 검색 RPC 사용 (거리순 정렬)
  if (lat && lng) {
    const { data, error } = await supabase.rpc('nearby_restaurants', {
      lat: Number(lat),
      lng: Number(lng),
      radius_m: radius,
      max_results: limit,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // 식당 + 카테고리 + 전체 검증 뱃지를 항상 함께 조회.
  // 검증/카테고리 필터는 "뱃지 목록을 자르지 않기 위해" 조회 후 부모 단위로 적용한다.
  // (대규모 확장 시: 인증 존재 여부를 별도 alias의 !inner 임베드 또는 RPC로 DB단에서 필터링)
  const { data, error } = await supabase
    .from('restaurants')
    .select(
      `id, name, branch_name, address_road, address_jibun,
       latitude, longitude, sido, sigungu, phone, status,
       keywords, tagline, reason_to_visit,
       category:categories(slug, name_ko),
       verifications:restaurant_verifications(
         grade, rating, awarded_year, recommender,
         type:verification_types(code, name_ko, badge_color)
       )`,
    )
    .eq('status', 'published')
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 임베드 조인 결과는 느슨하게 다룬다 (정밀 타이핑은 supabase gen types로 대체 예정)
  let result = (data ?? []) as any[]
  if (category) {
    result = result.filter((r) => r.category?.slug === category)
  }
  if (verification) {
    result = result.filter((r) =>
      r.verifications?.some((v: any) => v.type?.code === verification),
    )
  }

  return NextResponse.json({ data: result })
}
