// =============================================================================
// 앱이 사용하는 식당 데이터셋 (단일 소스)
//   - 미쉐린:   실데이터 (michelin-seoul.geocoded.json, 카카오 지오코딩)
//   - 블루리본: 실데이터 (blue-ribbon.geocoded.json, 카카오 지오코딩)
//               미쉐린과 이름이 겹치면 새 행을 만들지 않고 인증만 병합한다.
//   - 그 외(백년가게/연예인 픽): 실데이터 확보 전까지 데모 항목 유지
// 추후 Supabase 연결 시 이 모듈을 API 응답으로 대체한다.
// =============================================================================
import michelinGeo from './michelin-seoul.geocoded.json'
import blueRibbonGeo from './blue-ribbon.geocoded.json'
import goodPriceCc from './good-price-chuncheon.geocoded.json'
import centennialCc from './centennial-chuncheon.geocoded.json'
import blueRibbonCc from './blue-ribbon-chuncheon.geocoded.json'
import {
  RESTAURANTS as DEMO,
  type Restaurant,
  type VerificationCode,
} from '@/lib/mock/restaurants'

interface MichelinRow {
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

interface BlueRibbonRow {
  nameKo: string
  ribbons: number
  year: number
  region: string
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

/** 이름 매칭용 정규화 ("알라 프리마" === "알라프리마") */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '')
}

function michelinToRestaurant(g: MichelinRow): Restaurant {
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

function blueRibbonToRestaurant(g: BlueRibbonRow): Restaurant {
  const cuisine = cuisineOf(g.category)
  const gu = guOf(g.addressRoad)
  return {
    id: `blue-ribbon-${normalizeName(g.nameKo)}`,
    name: g.nameKo,
    category: cuisine,
    keywords: [cuisine, gu ?? g.region].filter(Boolean) as string[],
    tagline: '',
    reason: '',
    addressRoad: g.addressRoad,
    lat: g.lat,
    lng: g.lng,
    verifications: [
      { code: 'blue_ribbon' as VerificationCode, rating: g.ribbons, awardedYear: g.year },
    ],
  }
}

export const MICHELIN_RESTAURANTS: Restaurant[] = (michelinGeo as MichelinRow[])
  .filter((g) => !PENDING.has(g.nameEn))
  .map(michelinToRestaurant)

// 블루리본 통합: 미쉐린과 이름이 겹치면 기존 행에 blue_ribbon 인증을 병합하고,
//               겹치지 않으면 독립 블루리본 행으로 추가한다.
const michelinByName = new Map(
  MICHELIN_RESTAURANTS.map((r) => [normalizeName(r.name), r]),
)

const BLUE_RIBBON_ONLY: Restaurant[] = []
for (const g of blueRibbonGeo as BlueRibbonRow[]) {
  const match = michelinByName.get(normalizeName(g.nameKo))
  if (match) {
    if (!match.verifications.some((v) => v.code === 'blue_ribbon')) {
      match.verifications.push({
        code: 'blue_ribbon' as VerificationCode,
        rating: g.ribbons,
        awardedYear: g.year,
      })
    }
  } else {
    BLUE_RIBBON_ONLY.push(blueRibbonToRestaurant(g))
  }
}

export const BLUE_RIBBON_RESTAURANTS: Restaurant[] = BLUE_RIBBON_ONLY

// ── 춘천 소스(착한가격업소·백년가게·블루리본) 통합 ─────────────────────────────
// 한 식당이 여러 소스에 등장 가능 → 거리(60m)+이름 기준 병합 → 행 1개 + 인증 여러 개.
// (scripts/gen-seed-chuncheon.mjs 와 동일 로직 — 변경 시 함께 유지)
interface ChuncheonRow {
  source: VerificationCode
  nameKo: string
  ribbons?: number
  year: number
  sido: string
  sigungu: string
  addressRoad: string
  category: string
  phone?: string
  lat: number
  lng: number
  externalId: string
}

const CC_PRIORITY: Record<string, number> = { blue_ribbon: 3, centennial: 2, good_price: 1 }

function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const nameMatch = (a: string, b: string) => {
  const x = normalizeName(a)
  const y = normalizeName(b)
  return x.includes(y) || y.includes(x)
}

const CHUNCHEON_RESTAURANTS: Restaurant[] = (() => {
  const records = [
    ...(blueRibbonCc as ChuncheonRow[]),
    ...(centennialCc as ChuncheonRow[]),
    ...(goodPriceCc as ChuncheonRow[]),
  ]
  const venues: ChuncheonRow[][] = []
  for (const rec of records) {
    const v = venues.find((g) =>
      g.some((r) => distM(r, rec) < 60 && nameMatch(r.nameKo, rec.nameKo)),
    )
    if (v) v.push(rec)
    else venues.push([rec])
  }
  return venues.map((recs) => {
    const primary = [...recs].sort(
      (a, b) => CC_PRIORITY[b.source] - CC_PRIORITY[a.source],
    )[0]
    const cuisine = cuisineOf(primary.category)
    return {
      id: `${primary.source}-${normalizeName(primary.nameKo)}`,
      name: primary.nameKo,
      category: cuisine,
      keywords: [cuisine, primary.sigungu].filter(Boolean) as string[],
      tagline: '',
      reason: '',
      addressRoad: primary.addressRoad,
      lat: primary.lat,
      lng: primary.lng,
      sido: primary.sido,
      sigungu: primary.sigungu,
      verifications: recs.map((r) => ({
        code: r.source,
        rating: r.ribbons,
        awardedYear: r.year,
      })),
    }
  })
})()

// 미쉐린·블루리본 외 카테고리는 아직 실데이터가 없어 데모 항목 유지
const DEMO_OTHER = DEMO.filter(
  (r) =>
    !r.verifications.some(
      (v) => v.code === 'michelin' || v.code === 'blue_ribbon',
    ),
)

export const RESTAURANT_DATASET: Restaurant[] = [
  ...MICHELIN_RESTAURANTS,
  ...BLUE_RIBBON_ONLY,
  ...CHUNCHEON_RESTAURANTS,
  ...DEMO_OTHER,
]
