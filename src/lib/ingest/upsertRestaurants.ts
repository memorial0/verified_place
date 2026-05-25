import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 외부 소스(공공 API / 크롤링)에서 수집한 식당을 멱등하게(idempotent) 적재한다.
 *
 * 핵심: (data_source, external_id) unique 인덱스를 onConflict 키로 사용 →
 *      같은 소스의 같은 원본 데이터를 여러 번 돌려도 중복 INSERT 없이 UPDATE.
 *      이것이 "공공 API → 크롤링" 확장 단계에서 데이터 정합성을 지키는 축이다.
 */
export interface IncomingRestaurant {
  name: string
  address_jibun?: string | null
  address_road?: string | null
  latitude?: number | null
  longitude?: number | null
  phone?: string | null
  data_source: string // 예: 'public_api_seoul', 'crawl_naver'
  external_id: string // 원본 소스의 고유 ID
}

export async function upsertRestaurants(rows: IncomingRestaurant[]) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('restaurants')
    .upsert(rows, { onConflict: 'data_source,external_id' })
    .select('id, name')

  if (error) throw new Error(`upsertRestaurants failed: ${error.message}`)
  return data
}
