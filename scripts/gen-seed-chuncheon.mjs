// 춘천 소스별 geocoded JSON(착한가격업소·백년가게·블루리본) → 중복제거 → 0005 시드 SQL
// 실행: node scripts/gen-seed-chuncheon.mjs
//
// 한 식당이 여러 소스에 등장 가능 → 행 1개 + 인증 여러 개.
// 병합 기준: 거리 < 60m AND 이름 포함관계. primary source(우선순위)가 행을 대표.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SRC = [
  'src/lib/data/blue-ribbon-chuncheon.geocoded.json',
  'src/lib/data/centennial-chuncheon.geocoded.json',
  'src/lib/data/good-price-chuncheon.geocoded.json',
]
const PRIORITY = { blue_ribbon: 3, centennial: 2, good_price: 1 }

const records = SRC.flatMap((f) =>
  existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [],
)
if (records.length === 0) {
  console.error('춘천 geocoded JSON이 비어 있습니다. 먼저 import-chuncheon.mjs 로 적재하세요.')
  process.exit(1)
}

const norm = (s) => String(s).replace(/\s+/g, '')
const nameMatch = (a, b) => {
  const x = norm(a), y = norm(b)
  return x.includes(y) || y.includes(x)
}
function distM(a, b) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// ── venue 그룹핑 (거리<60m AND 이름 포함관계) ─────────────────────────────────
const venues = []
for (const rec of records) {
  const v = venues.find((g) =>
    g.records.some((r) => distM(r, rec) < 60 && nameMatch(r.nameKo, rec.nameKo)),
  )
  if (v) v.records.push(rec)
  else venues.push({ records: [rec] })
}

// 각 venue의 primary(대표) 레코드 = 우선순위 최고
for (const v of venues) {
  v.primary = [...v.records].sort(
    (a, b) => PRIORITY[b.source] - PRIORITY[a.source],
  )[0]
}

console.log(`레코드 ${records.length} → venue ${venues.length}개`)
const multi = venues.filter((v) => new Set(v.records.map((r) => r.source)).size > 1)
console.log(`멀티소스 venue: ${multi.length}개`, multi.map((v) => v.primary.nameKo).join(', ') || '(없음)')

// ── SQL 생성 ──────────────────────────────────────────────────────────────────
const slugOf = (c = '') =>
  /일식|초밥|돈가스|스시/.test(c) ? 'japanese'
  : /중식|중국/.test(c) ? 'chinese'
  : /양식|이탈리|프랑스|스테이크|피자|파스타/.test(c) ? 'western'
  : /카페|제과|베이커리|디저트|커피/.test(c) ? 'cafe_dessert'
  : /한식|분식|국밥|국수|곰탕|냉면|백반|찌개|고기|음식/.test(c) ? 'korean'
  : null
const cuisineOf = (c = '') => c.split('>').map((s) => s.trim()).pop() || '음식점'
const s = (v) => `'${String(v).replace(/'/g, "''")}'`
const jsonb = (o) => `'${JSON.stringify(o ?? {}).replace(/'/g, "''")}'::jsonb`
const arr = (xs) => `ARRAY[${xs.map(s).join(',')}]`

const restValues = venues.map((v) => {
  const p = v.primary
  // 전화/카테고리는 가진 레코드에서 보충
  const phone = v.records.map((r) => r.phone).find(Boolean) || null
  const category = v.records.map((r) => r.category).find(Boolean) || '음식점'
  const slug = slugOf(category)
  const cat = slug ? `(select id from public.categories where slug='${slug}')` : 'null'
  const kws = [cuisineOf(category), p.sigungu].filter(Boolean)
  return `  (${s(p.nameKo)}, ${s(p.addressRoad)}, ${p.lat}, ${p.lng}, ${s(p.sido)}, ${s(p.sigungu)}, ${phone ? s(phone) : 'null'}, ${cat}, ${arr(kws)}, ${s(p.source)}, ${s(p.externalId)}, 'published')`
}).join(',\n')

// 인증: venue별 모든 소스 → primary (data_source, external_id) 로 조인
const verValues = venues.flatMap((v) =>
  v.records.map((r) =>
    `  (${s(v.primary.source)}, ${s(v.primary.externalId)}, ${s(r.source)}, ${r.ribbons ?? 'null'}, ${r.year}, ${jsonb(r.metadata)})`,
  ),
).join(',\n')

const sql = `-- 0005_seed_chuncheon.sql
-- 춘천 검증 데이터(착한가격업소·백년가게·블루리본). Supabase SQL Editor에 붙여넣어 실행.
-- 먼저 0004(지역 컬럼 + good_price 타입)가 적용돼 있어야 한다.
-- 재실행 안전: 춘천(sigungu='춘천시')의 해당 소스 행을 지우고 새로 넣는다(서울 데이터 불간섭).
-- 좌표/주소 출처: 카카오 Local 지오코딩. 한 식당이 여러 소스면 행 1개 + 인증 여러 개.

delete from public.restaurants
 where sigungu = '춘천시'
   and data_source in ('good_price', 'centennial', 'blue_ribbon');

insert into public.restaurants
  (name, address_road, latitude, longitude, sido, sigungu, phone,
   category_id, keywords, data_source, external_id, status)
values
${restValues};

insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, rating, awarded_year, is_verified, metadata)
select r.id, vt.id, v.rating, v.year, true, v.metadata
from (values
${verValues}
) as v(primary_source, primary_ext, code, rating, year, metadata)
join public.restaurants r
  on r.data_source = v.primary_source and r.external_id = v.primary_ext
join public.verification_types vt on vt.code = v.code;
`

writeFileSync('supabase/migrations/0005_seed_chuncheon.sql', sql)
console.log(`✅ venue ${venues.length}행 + 인증 ${records.length}건 → supabase/migrations/0005_seed_chuncheon.sql`)
