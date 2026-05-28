// 춘천 모범음식점 CSV → 0008_seed_exemplary_chuncheon.sql
//
// 입력 CSV (cp949 권장, UTF-8 도 자동 대응):
//   업소명, 소재지(도로명), 위도, 경도, 소재지전화번호, 음식의유형, 지정일자,
//   주된음식, 입식좌식여부, 휠체어이용가능여부
//
// 실행:
//   node scripts/import-exemplary-chuncheon.mjs --file data/raw/exemplary-chuncheon.csv
//
// 좌표가 이미 있으므로 지오코딩 생략.
// 기존 춘천 식당(centennial/good_price 등) 과 거리 60m + 이름 포함관계로 매칭 →
//   매칭(A): exemplary verification 만 추가 (행은 안 만듦)
//   신규(C): restaurants + verification 동시 INSERT
// 출력 SQL 은 재실행 안전(0005 패턴): exemplary verification 전체 삭제 → exemplary
// data_source row 삭제 → 새로 INSERT. 다른 인증·다른 소스 행에는 영향 없음.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// ── args ─────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]])
    return acc
  }, []),
)
const FILE = args.file
const OUT = args.out ?? 'supabase/migrations/0008_seed_exemplary_chuncheon.sql'
const DEFAULT_YEAR = Number(args.year ?? 2025)

if (!FILE || !existsSync(FILE)) {
  console.error(`파일 없음: ${FILE}`)
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수 필요')
  process.exit(1)
}

// ── 디코딩 (UTF-8 우선, 깨지면 EUC-KR/cp949) ────────────────────────────────
function decode(buf) {
  let t = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  if (t.includes('�')) {
    try { t = new TextDecoder('euc-kr').decode(buf) }
    catch { console.error('euc-kr 디코딩 불가 — iconv-lite 필요') }
  }
  return t.replace(/^﻿/, '')
}

// ── CSV 파서 (따옴표/내부 콤마·개행 지원) ──────────────────────────────────────
function parseCsv(text) {
  const rows = []
  let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (c === '\r') { /* skip */ }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const norm = (s) => (s || '').replace(/\s+/g, '').replace(/[()[\]{}.,\-_!?]/g, '')
const distM = (a, b) => {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
const nameMatch = (a, b) => {
  const x = norm(a), y = norm(b)
  return x.length && y.length && (x.includes(y) || y.includes(x))
}
const slugFor = (cuisine) => {
  const c = (cuisine || '').trim()
  if (c.includes('한식') || c.includes('한국')) return 'korean'
  if (c.includes('중식') || c.includes('중국')) return 'chinese'
  if (c.includes('양식') || c.includes('서양')) return 'western'
  if (c.includes('일식') || c.includes('일본')) return 'japanese'
  if (c.includes('카페') || c.includes('제과') || c.includes('빵') || c.includes('디저트')) return 'cafe_dessert'
  return null
}
const yearOf = (s) => {
  const m = (s || '').match(/(\d{4})/)
  return m ? Number(m[1]) : null
}
const wheelchair = (s) => {
  const t = (s || '').trim()
  if (!t) return null
  if (/^(Y|y|예|가능|O|o)$/.test(t) || t.includes('가능')) return true
  if (/^(N|n|아니오|불가|X|x)$/.test(t) || t.includes('불가')) return false
  return null
}

// ── 컬럼 인덱스 매핑 (헤더 변형 대응) ─────────────────────────────────────────
function findCol(headers, candidates) {
  for (const cand of candidates) {
    const i = headers.findIndex((h) => h === cand)
    if (i !== -1) return i
  }
  // 부분 매칭 폴백
  for (const cand of candidates) {
    const i = headers.findIndex((h) => h.includes(cand))
    if (i !== -1) return i
  }
  return -1
}

// ── CSV 읽기 ─────────────────────────────────────────────────────────────────
const raw = readFileSync(FILE)
const text = decode(raw)
const rows = parseCsv(text)
if (rows.length < 2) { console.error('CSV 비어있음'); process.exit(1) }

const headers = rows[0].map((h) => h.trim())
const COL = {
  name:       findCol(headers, ['업소명']),
  addressRoad:findCol(headers, ['소재지(도로명)', '소재지도로명주소', '도로명주소', '소재지']),
  lat:        findCol(headers, ['위도']),
  lng:        findCol(headers, ['경도']),
  phone:      findCol(headers, ['소재지전화번호', '전화번호']),
  category:   findCol(headers, ['음식의유형', '업종', '업태']),
  awardedDate:findCol(headers, ['지정일자']),
  primaryMenu:findCol(headers, ['주된음식', '주요음식', '주메뉴']),
  seating:    findCol(headers, ['입식좌식여부', '입식좌석여부', '좌식여부']),
  wheelchair: findCol(headers, ['휠체어이용가능여부', '휠체어가능여부', '휠체어']),
}
if (COL.name === -1 || COL.lat === -1 || COL.lng === -1) {
  console.error('필수 컬럼(업소명/위도/경도) 누락. 발견된 헤더:', headers)
  process.exit(1)
}

const records = rows.slice(1)
  .map((r) => ({
    name:        (r[COL.name] || '').trim(),
    addressRoad: COL.addressRoad !== -1 ? (r[COL.addressRoad] || '').trim() : '',
    lat:         Number(r[COL.lat]),
    lng:         Number(r[COL.lng]),
    phone:       COL.phone       !== -1 ? (r[COL.phone] || '').trim() : '',
    category:    COL.category    !== -1 ? (r[COL.category] || '').trim() : '',
    awardedYear: COL.awardedDate !== -1 ? (yearOf(r[COL.awardedDate]) ?? DEFAULT_YEAR) : DEFAULT_YEAR,
    primaryMenu: COL.primaryMenu !== -1 ? (r[COL.primaryMenu] || '').trim() : '',
    seating:     COL.seating     !== -1 ? (r[COL.seating] || '').trim() : '',
    wheelchair:  COL.wheelchair  !== -1 ? wheelchair(r[COL.wheelchair]) : null,
  }))
  .filter((r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lng))

console.log(`📂 ${FILE}: 유효 행 ${records.length}개`)

// ── 기존 춘천 식당 조회 (read-only, anon key) ───────────────────────────────
const url = `${SUPABASE_URL}/rest/v1/restaurants?select=id,name,latitude,longitude,data_source,external_id&sigungu=eq.%EC%B6%98%EC%B2%9C%EC%8B%9C&status=eq.published&limit=2000`
const res = await fetch(url, {
  headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
})
if (!res.ok) {
  console.error(`Supabase ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const existing = await res.json()
console.log(`🗃  기존 춘천 식당 ${existing.length}곳 조회`)

// ── 매칭 (시나리오 A/C) ─────────────────────────────────────────────────────
// 같은 CSV 안에서도 중복이 있을 수 있으니 first-wins 로 자체 dedup.
const seen = new Map()
const matched = [], novel = []
for (const rec of records) {
  const dupKey = `${rec.lat.toFixed(5)}|${rec.lng.toFixed(5)}|${norm(rec.name)}`
  if (seen.has(dupKey)) continue
  seen.set(dupKey, true)

  const hit = existing.find(
    (e) => distM({ lat: e.latitude, lng: e.longitude }, rec) < 60 && nameMatch(e.name, rec.name),
  )
  if (hit) matched.push({ rec, existing: hit })
  else novel.push(rec)
}
console.log(`✅ 매칭(A) ${matched.length}곳 — 기존 row 에 verification 만 추가`)
console.log(`🆕 신규(C) ${novel.length}곳 — restaurants + verification 새로 INSERT`)
if (matched.length) {
  console.log(`   매칭 예시:`)
  matched.slice(0, 5).forEach(({ rec, existing: e }) =>
    console.log(`     · "${rec.name}" ↔ "${e.name}" (${e.data_source})`))
}

// ── SQL 생성 ─────────────────────────────────────────────────────────────────
const s = (v) => v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`
const arr = (xs) => `ARRAY[${xs.filter(Boolean).map(s).join(',')}]`
const metaJson = (rec) => {
  const m = {}
  if (rec.primaryMenu) m.primary_menu = rec.primaryMenu
  if (rec.seating) m.seating = rec.seating
  if (rec.wheelchair !== null) m.wheelchair_accessible = rec.wheelchair
  return JSON.stringify(m)
}
const extId = (name) => `exemplary-춘천-${norm(name)}`

// 시나리오 C — restaurants INSERT 값
const novelRows = novel.map((rec) => {
  const slug = slugFor(rec.category)
  const cat = slug ? `(select id from public.categories where slug='${slug}')` : 'null'
  const kws = [rec.category || '음식점', '춘천시']
  return `  (${s(rec.name)}, ${s(rec.addressRoad)}, ${rec.lat}, ${rec.lng}, '강원특별자치도', '춘천시', ${s(rec.phone)}, ${cat}, ${arr(kws)}, 'exemplary', ${s(extId(rec.name))}, 'published')`
}).join(',\n')

// A + C 모두 — verification VALUES (source, ext_id, year, metadata)
// 첫 행에 명시적 타입 캐스트(::text, ::int)를 박아 VALUES 컬럼 타입을 확정시킨다.
// 후속 행에 null 이 와도 PG 가 unknown 으로 추론하지 않도록(0005 에서 한 번 깨졌던 패턴).
const verValuesRaw = []
for (const rec of novel) {
  verValuesRaw.push(`('exemplary', ${s(extId(rec.name))}, ${rec.awardedYear ?? 'null'}, ${s(metaJson(rec))}::jsonb)`)
}
for (const { rec, existing: hit } of matched) {
  verValuesRaw.push(`(${s(hit.data_source)}, ${s(hit.external_id)}, ${rec.awardedYear ?? 'null'}, ${s(metaJson(rec))}::jsonb)`)
}
// 첫 행에만 명시 타입 (PG 가 VALUES 컬럼 타입을 첫 행 기준으로 확정)
const verValues = verValuesRaw.map((row, i) => {
  if (i !== 0) return `  ${row}`
  // ('source', 'ext', year, '{...}'::jsonb) → ('source'::text, 'ext'::text, year::int, '{...}'::jsonb)
  return `  ${row.replace(/^\((.*?),(.*?),(.*?),(.*)\)$/, (_, a, b, c, d) =>
    `(${a.trim()}::text, ${b.trim()}::text, ${c.trim()}::int, ${d.trim()})`)}`
})

const novelSql = novel.length
  ? `insert into public.restaurants
  (name, address_road, latitude, longitude, sido, sigungu, phone,
   category_id, keywords, data_source, external_id, status)
values
${novelRows};
`
  : `-- 신규 row 없음 (모든 CSV 항목이 기존 춘천 식당과 매칭됨)
`

const sql = `-- 0008_seed_exemplary_chuncheon.sql
-- 춘천 모범음식점 시드. import-exemplary-chuncheon.mjs 가 CSV 로부터 생성.
-- 0007(exemplary verification_type) 이 먼저 적용돼 있어야 한다.
--
-- 재실행 안전:
--   1) exemplary 인증 전부 삭제 (기존 centennial/good_price row 에 붙은 것 포함)
--   2) exemplary data_source row 삭제 (1번에서 verification 은 이미 정리됨)
--   3) 새로 INSERT
-- → 다른 인증(michelin/blue_ribbon/centennial/good_price)·다른 소스 행에는 영향 없음.
--
-- 매칭 결과: 매칭(A) ${matched.length}곳 + 신규(C) ${novel.length}곳 = 총 ${matched.length + novel.length}개 모범음식점 인증.

delete from public.restaurant_verifications
 where verification_type_id = (select id from public.verification_types where code = 'exemplary');

delete from public.restaurants
 where sigungu = '춘천시' and data_source = 'exemplary';

${novelSql}
insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, awarded_year, is_verified, metadata)
select r.id, vt.id, v.year, true, v.metadata
from (values
${verValues.join(',\n')}
) as v(source, ext_id, year, metadata)
join public.restaurants r on r.data_source = v.source and r.external_id = v.ext_id
join public.verification_types vt on vt.code = 'exemplary';
`

writeFileSync(OUT, sql)
console.log(`\n✅ ${OUT} 생성`)
console.log(`   신규 ${novel.length} 행 + 인증 ${matched.length + novel.length} 건`)
