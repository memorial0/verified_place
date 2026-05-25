// =============================================================================
// 앱이 사용하는 식당 데이터셋 (단일 소스)
//   - 미쉐린: 실데이터 (michelin-seoul.geocoded.json, 카카오 지오코딩 결과)
//   - 그 외(블루리본/백년가게/연예인 픽): 실데이터 확보 전까지 데모 항목 유지
// 추후 Supabase 연결 시 이 모듈을 API 응답으로 대체한다.
// =============================================================================
import geocoded from './michelin-seoul.geocoded.json'
import {
  RESTAURANTS as DEMO,
  type Restaurant,
  type VerificationCode,
} from '@/lib/mock/restaurants'

interface GeocodedRow {
  nameKo: string
  nameEn: string
  stars: number
  year: number
  placeName: string
  addressRoad: string
  category: string
  lat: number
  lng: number
}

// 위치/분류 검증 미완료로 보류 중 (정확한 주소 확보 후 편입)
//   - Soigné(스와니예): 카카오가 '식품판매' 법인으로 오인
//   - Kojima(코지마): 카카오 POI 미등록 → geocoded.json에 아예 없음
const PENDING = new Set<string>(['Soigné'])

/** "음식점 > 퓨전요리 > 퓨전한식" → "퓨전한식" */
function cuisineOf(category: string): string {
  const parts = category.split('>').map((s) => s.trim())
  return parts[parts.length - 1] || '음식점'
}

/** "서울 강남구 도산대로67길 19" → "강남구" */
function guOf(address: string): string | null {
  return address.match(/(\S+구)/)?.[1] ?? null
}

function toRestaurant(g: GeocodedRow): Restaurant {
  const cuisine = cuisineOf(g.category)
  const gu = guOf(g.addressRoad)
  return {
    id: `michelin-${g.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    name: g.nameKo,
    category: cuisine,
    keywords: gu ? [cuisine, gu] : [cuisine],
    tagline: '', // 미쉐린엔 편집 문구가 없으므로 비움 (추후 입력)
    reason: '',
    addressRoad: g.addressRoad,
    lat: g.lat,
    lng: g.lng,
    verifications: [
      { code: 'michelin' as VerificationCode, rating: g.stars, awardedYear: g.year },
    ],
  }
}

export const MICHELIN_RESTAURANTS: Restaurant[] = (geocoded as GeocodedRow[])
  .filter((g) => !PENDING.has(g.nameEn))
  .map(toRestaurant)

// 미쉐린 외 카테고리는 아직 실데이터가 없어 데모 항목 유지 (가짜 미슐랭 항목은 제외)
const DEMO_NON_MICHELIN = DEMO.filter(
  (r) => !r.verifications.some((v) => v.code === 'michelin'),
)

export const RESTAURANT_DATASET: Restaurant[] = [
  ...MICHELIN_RESTAURANTS,
  ...DEMO_NON_MICHELIN,
]
