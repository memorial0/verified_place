// geocoded 미슐랭 데이터 → Supabase 시드 SQL 생성
// 실행: node scripts/gen-seed-sql.mjs  → supabase/migrations/0002_seed_michelin_seoul.sql
import { readFileSync, writeFileSync } from 'node:fs'

const geo = JSON.parse(
  readFileSync('src/lib/data/michelin-seoul.geocoded.json', 'utf8'),
)
const PENDING = new Set(['Soigné']) // 위치 미확정 보류
const rows = geo.filter((g) => !PENDING.has(g.nameEn))

const slugOf = (c) =>
  c.includes('일식')
    ? 'japanese'
    : c.includes('중')
      ? 'chinese'
      : c.includes('양식')
        ? 'western'
        : c.includes('한식')
          ? 'korean'
          : null
const cuisineOf = (c) => c.split('>').map((s) => s.trim()).pop()
const guOf = (a) => a.match(/(\S+구)/)?.[1] ?? null
const extId = (n) =>
  'michelin-' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const s = (v) => `'${String(v).replace(/'/g, "''")}'`
const arr = (xs) => `ARRAY[${xs.map(s).join(',')}]`

const restValues = rows
  .map((g) => {
    const slug = slugOf(g.category)
    const kws = [cuisineOf(g.category), guOf(g.addressRoad)].filter(Boolean)
    const cat = slug ? `(select id from public.categories where slug='${slug}')` : 'null'
    return `  (${s(g.nameKo)}, ${s(g.addressRoad)}, ${g.lat}, ${g.lng}, ${cat}, ${arr(kws)}, 'michelin_guide', ${s(extId(g.nameEn))}, 'published')`
  })
  .join(',\n')

const verValues = rows.map((g) => `  (${s(extId(g.nameEn))}, ${g.stars})`).join(',\n')

const sql = `-- 0002_seed_michelin_seoul.sql
-- 미쉐린 가이드 서울 2025 별점집 시드. Supabase SQL Editor에 붙여넣어 실행.
-- 재실행 안전: 기존 michelin_guide 행을 지우고(연결 인증은 cascade 삭제) 새로 넣는다.
-- 좌표/주소 출처: 카카오 Local 지오코딩 (src/lib/data/michelin-seoul.geocoded.json)

delete from public.restaurants where data_source = 'michelin_guide';

insert into public.restaurants
  (name, address_road, latitude, longitude, category_id, keywords, data_source, external_id, status)
values
${restValues};

insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, rating, awarded_year, is_verified)
select r.id, vt.id, v.stars, 2025, true
from (values
${verValues}
) as v(external_id, stars)
join public.restaurants r
  on r.data_source = 'michelin_guide' and r.external_id = v.external_id
join public.verification_types vt on vt.code = 'michelin';
`

writeFileSync('supabase/migrations/0002_seed_michelin_seoul.sql', sql)
console.log(sql)
