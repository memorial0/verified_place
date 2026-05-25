/**
 * DB 도메인 타입.
 *
 * 실제 운영에서는 아래 명령으로 스키마와 100% 동기화된 타입을 자동 생성하는 것을 권장:
 *   npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts
 *
 * 여기서는 supabase-js 제네릭(<Database>)에 필요한 최소 형태를 손으로 정의한다.
 */

export type RestaurantStatus = 'draft' | 'published' | 'archived' | 'flagged'

export interface Restaurant {
  id: string
  name: string
  branch_name: string | null
  address_jibun: string | null
  address_road: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  category_id: number | null
  description: string | null
  keywords: string[]
  tagline: string | null
  reason_to_visit: string | null
  status: RestaurantStatus
  data_source: string
  external_id: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  slug: string
  name_ko: string
  name_en: string | null
  created_at: string
}

export interface VerificationType {
  id: number
  code: string
  name_ko: string
  name_en: string | null
  authority: string | null
  description: string | null
  badge_color: string | null
  icon_url: string | null
  weight: number
  is_active: boolean
  created_at: string
}

export interface RestaurantVerification {
  id: string
  restaurant_id: string
  verification_type_id: number
  grade: string | null
  rating: number | null
  awarded_year: number | null
  recommender: string | null
  source_url: string | null
  valid_from: string | null
  valid_until: string | null
  is_verified: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** API 응답용 합성 타입 (식당 + 카테고리 + 검증 뱃지). */
export interface RestaurantWithVerifications extends Restaurant {
  category: Pick<Category, 'slug' | 'name_ko'> | null
  verifications: Array<{
    grade: string | null
    rating: number | null
    awarded_year: number | null
    recommender: string | null
    type: Pick<VerificationType, 'code' | 'name_ko' | 'badge_color'> | null
  }>
}

/** supabase-js 제네릭용 Database 타입 (필요한 부분만 정의). */
export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: Restaurant
        Insert: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<Restaurant, 'id'>>
        Update: Partial<Restaurant>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Category>
      }
      verification_types: {
        Row: VerificationType
        Insert: Omit<VerificationType, 'id' | 'created_at'>
        Update: Partial<VerificationType>
      }
      restaurant_verifications: {
        Row: RestaurantVerification
        Insert: Omit<RestaurantVerification, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<RestaurantVerification>
      }
    }
    Functions: {
      nearby_restaurants: {
        Args: {
          lat: number
          lng: number
          radius_m?: number
          max_results?: number
        }
        Returns: Restaurant[]
      }
    }
  }
}
