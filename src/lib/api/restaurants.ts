import {
  RESTAURANTS,
  type FilterValue,
  type Restaurant,
  type VerificationCode,
} from '@/lib/mock/restaurants'

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
 * 식당 목록 조회.
 * - 정상: `/api/restaurants?verification=...` 응답 사용 (source: 'live')
 * - 실패(API 미연동/네트워크/500 등): Mock 데이터를 클라이언트 필터링하여 사용 (source: 'fallback')
 *   → Supabase를 켜지 않은 로컬 개발 환경에서도 화면이 그대로 동작한다.
 */
export async function fetchRestaurants(
  filter: FilterValue,
): Promise<{ restaurants: Restaurant[]; source: DataSource }> {
  const qs = filter === 'all' ? '' : `?verification=${encodeURIComponent(filter)}`

  try {
    const res = await fetch(`/api/restaurants${qs}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { data?: ApiRestaurant[] }
    return { restaurants: (json.data ?? []).map(mapApiRestaurant), source: 'live' }
  } catch {
    return { restaurants: filterMock(filter), source: 'fallback' }
  }
}

function filterMock(filter: FilterValue): Restaurant[] {
  return filter === 'all'
    ? RESTAURANTS
    : RESTAURANTS.filter((r) => r.verifications.some((v) => v.code === filter))
}
