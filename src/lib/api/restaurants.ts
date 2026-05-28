import { type Restaurant, type VerificationCode } from '@/lib/mock/restaurants'
import { RESTAURANT_DATASET } from '@/lib/data/restaurants'

// ---- GET /api/restaurants 응답 형태 (snake_case, DB Row 기반) ----------------
interface ApiVerification {
  grade: string | null
  rating: number | null
  awarded_year: number | null
  recommender: string | null
  type: { code: string; name_ko: string; badge_color: string | null } | null
}

interface ApiRestaurant {
  id: string
  name: string
  address_road: string | null
  address_jibun: string | null
  latitude: number | null
  longitude: number | null
  sido: string | null
  sigungu: string | null
  keywords: string[] | null
  tagline: string | null
  reason_to_visit: string | null
  category: { slug: string; name_ko: string } | null
  verifications: ApiVerification[] | null
}

/** API(snake_case, 정규화) → 프론트 도메인(camelCase) 매핑 */
export function mapApiRestaurant(r: ApiRestaurant): Restaurant {
  return {
    id: r.id,
    name: r.name,
    category: r.category?.name_ko ?? '',
    keywords: r.keywords ?? [],
    tagline: r.tagline ?? '',
    reason: r.reason_to_visit ?? '',
    addressRoad: r.address_road ?? r.address_jibun ?? '',
    lat: r.latitude ?? 0,
    lng: r.longitude ?? 0,
    sido: r.sido ?? undefined,
    sigungu: r.sigungu ?? undefined,
    verifications: (r.verifications ?? [])
      .filter((v) => v.type?.code)
      .map((v) => ({
        code: v.type!.code as VerificationCode,
        rating: v.rating ?? undefined,
        recommender: v.recommender ?? undefined,
        awardedYear: v.awarded_year ?? undefined,
      })),
  }
}

export type DataSource = 'live' | 'fallback'

/**
 * 식당 전체 조회 (region/verification 필터링은 클라이언트 측에서 수행).
 * - 정상: GET /api/restaurants 응답 (source: 'live')
 * - 실패/빈 응답: RESTAURANT_DATASET fallback (source: 'fallback')
 *   → Supabase 미연결 로컬 환경에서도 화면이 그대로 동작.
 */
export async function fetchRestaurants(): Promise<{
  restaurants: Restaurant[]
  source: DataSource
}> {
  try {
    const res = await fetch(`/api/restaurants`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data?: ApiRestaurant[] }
    const mapped = (json.data ?? []).map(mapApiRestaurant)
    // 라이브가 비어 있으면(아직 미시드/미연결) RESTAURANT_DATASET 으로 폴백 → 화면 안 비움
    if (mapped.length === 0) return { restaurants: RESTAURANT_DATASET, source: 'fallback' }
    return { restaurants: mapped, source: 'live' }
  } catch {
    return { restaurants: RESTAURANT_DATASET, source: 'fallback' }
  }
}
