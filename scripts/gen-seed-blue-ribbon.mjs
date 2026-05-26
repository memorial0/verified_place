// geocoded 블루리본 데이터 → Supabase 시드 SQL 생성
// 실행: node scripts/gen-seed-blue-ribbon.mjs → supabase/migrations/0003_seed_blue_ribbon.sql
//
// 미슐랭과 이름이 겹치는 식당은 새 restaurant 행을 만들지 않고(이미 michelin_guide로 존재),
// blue_ribbon 인증만 기존 행에 연결한다. 인증 연결은 이름(name) 매칭 기준.
import { readFileSync, writeFileSync } from 'node:fs'

const br = JSON.parse(readFileSync('src/lib/data/blue-ribbon.geocoded.json', 'utf8'))
const mich = JSON.parse(readFileSync('src/lib/data/michelin-seoul.geocoded.json', 'utf8'))

const norm = (s) => s.replace(/\s+/g, '')
const michNames = new Set(mich.map((m) => norm(m.nameKo)))

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
const extId = (n) => 'blue-ribbon-' + norm(n)
const s = (v) => `'${String(v).replace(/'/g, "''")}'`
const arr = (xs) => `ARRAY[${xs.map(s).join(',')}]`

// 미슐랭과 겹치지 않는 행만 새 restaurant로 삽입
const onlyRows = br.filter((g) => !michNames.has(norm(g.nameKo)))

const restValues = onlyRows
  .map((g) => {
    const slug = slugOf(g.category)
    const kws = [cuisineOf(g.category), guOf(g.addressRoad) ?? g.region].filter(Boolean)
    const cat = slug ? `(select id from public.categories where slug='${slug}')` : 'null'
    return `  (${s(g.nameKo)}, ${s(g.addressRoad)}, ${g.lat}, ${g.lng}, ${cat}, ${arr(kws)}, 'blue_ribbon', ${s(extId(g.nameKo))}, 'published')`
  })
  .join(',\n')

// 인증: 모든 BR 행 → 이름 매칭으로 연결(겹치면 기존 미슐랭 행, 아니면 새 BR 행)
const verValues = br
  .map((g) => `  (${s(g.nameKo)}, ${g.ribbons}, ${g.year})`)
  .join(',\n')

const sql = `-- 0003_seed_blue_ribbon.sql
-- 블루리본 서베이 시드. Supabase SQL Editor에 붙여넣어 실행.
-- 재실행 안전: 기존 blue_ribbon 인증/행을 지우고 새로 넣는다.
-- 좌표/주소 출처: 카카오 Local 지오코딩 (src/lib/data/blue-ribbon.geocoded.json)
-- ⚠️ 인증 연결은 restaurants.name 매칭 기준 — 동일 이름이 여러 행이면 모두 연결될 수 있음.

-- 미슐랭 행에 붙은 blue_ribbon 인증까지 제거(restaurants 삭제 cascade로는 안 지워짐)
delete from public.restaurant_verifications
  where verification_type_id = (select id from public.verification_types where code = 'blue_ribbon');
delete from public.restaurants where data_source = 'blue_ribbon';

insert into public.restaurants
  (name, address_road, latitude, longitude, category_id, keywords, data_source, external_id, status)
values
${restValues};

insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, rating, awarded_year, is_verified)
select r.id, vt.id, v.ribbons, v.year, true
from (values
${verValues}
) as v(name, ribbons, year)
join public.restaurants r on r.name = v.name
join public.verification_types vt on vt.code = 'blue_ribbon';
`

writeFileSync('supabase/migrations/0003_seed_blue_ribbon.sql', sql)
console.log(`✅ ${onlyRows.length}개 신규 행 + ${br.length}개 인증 → supabase/migrations/0003_seed_blue_ribbon.sql`)
