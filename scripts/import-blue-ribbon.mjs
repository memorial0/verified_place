// 정식 확보(라이선스/제휴)한 블루리본 전체 명단을 앱 데이터로 주입하는 import 파이프라인.
//
// 용도: 공개 출처에 없는 리본1·2 및 전국편(서울 제외) 데이터를 합법적으로 확보했을 때,
//       CSV/JSON 한 개만 넣으면 지오코딩→ blue-ribbon.geocoded.json 병합까지 한 번에.
//
// 실행:
//   KAKAO_REST_KEY=... node scripts/import-blue-ribbon.mjs <파일.csv|파일.json>
//
// 입력 스키마 (열/필드명):
//   필수: nameKo, ribbons(1|2|3), year, region(서울|부산|…)
//   선택: address(도로명/지번), lat, lng, category, query
//   ▸ lat·lng 있으면 그대로 사용(지오코딩 생략)
//   ▸ address 있으면 카카오 주소검색, 없으면 (query||nameKo)+region 키워드검색
// 결과: src/lib/data/blue-ribbon.geocoded.json 에 이름 기준 dedup 병합.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('사용법: node scripts/import-blue-ribbon.mjs <파일.csv|파일.json>')
  process.exit(1)
}

const OUT = 'src/lib/data/blue-ribbon.geocoded.json'
const KEY = process.env.KAKAO_REST_KEY
const norm = (s) => String(s).replace(/\s+/g, '')

// ── 파서: JSON 또는 간단 CSV(쉼표, 따옴표 묶음 지원) ─────────────────────────
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n')
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cells[i] ?? '').trim()]))
  })
}
function splitCsvLine(line) {
  const out = []
  let cur = '', q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}

const raw = readFileSync(file, 'utf8')
const records = file.endsWith('.json') ? JSON.parse(raw) : parseCsv(raw)

// ── 카카오 지오코딩 ───────────────────────────────────────────────────────────
async function kakao(path, params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`https://dapi.kakao.com/v2/local/${path}?${qs}`, {
    headers: { Authorization: `KakaoAK ${KEY}` },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).documents ?? []
}
async function resolve(r) {
  // 1) 좌표가 이미 있으면 그대로
  if (r.lat && r.lng) {
    return {
      placeName: r.nameKo,
      addressRoad: r.address || '',
      category: r.category || '음식점',
      lat: Number(r.lat),
      lng: Number(r.lng),
    }
  }
  if (!KEY) throw new Error('좌표 없음 + KAKAO_REST_KEY 없음')
  // 2) 주소가 있으면 주소검색
  if (r.address) {
    const d = (await kakao('search/address.json', { query: r.address, size: 1 }))[0]
    if (d) return {
      placeName: r.nameKo,
      addressRoad: d.road_address?.address_name || d.address_name,
      category: r.category || '음식점',
      lat: Number(d.y), lng: Number(d.x),
    }
  }
  // 3) 키워드(상호+지역)검색
  const docs = await kakao('search/keyword.json', {
    query: r.query || r.nameKo, category_group_code: 'FD6', size: 5,
  })
  const d = docs.find((x) => (x.road_address_name || x.address_name || '').startsWith(r.region)) ?? docs[0]
  if (!d) return null
  return {
    placeName: d.place_name,
    addressRoad: d.road_address_name || d.address_name,
    category: d.category_name,
    lat: Number(d.y), lng: Number(d.x),
  }
}

// ── 기존 geocoded와 병합(이름 기준 dedup; 새 데이터 우선) ──────────────────────
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []
const byName = new Map(existing.map((e) => [norm(e.nameKo), e]))

let added = 0, updated = 0, failed = 0
for (const r of records) {
  if (!r.nameKo || !r.ribbons || !r.year || !r.region) {
    console.log(`⚠️  필수 필드 누락: ${JSON.stringify(r)}`)
    failed++; continue
  }
  try {
    const geo = await resolve(r)
    if (!geo) { console.log(`❌ ${r.nameKo} — 지오코딩 실패`); failed++; continue }
    const row = { nameKo: r.nameKo, ribbons: Number(r.ribbons), year: Number(r.year), region: r.region, ...geo }
    const key = norm(r.nameKo)
    if (byName.has(key)) updated++; else added++
    byName.set(key, row)
    console.log(`✅ ${r.nameKo.padEnd(12)} [리본${row.ribbons}/${row.region}] → ${geo.addressRoad}`)
  } catch (err) {
    console.log(`⚠️  ${r.nameKo}: ${err.message}`); failed++
  }
}

const merged = [...byName.values()]
writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n')
console.log(`\n💾 ${merged.length}곳 (신규 ${added} · 갱신 ${updated} · 실패 ${failed}) → ${OUT}`)
console.log('다음: node scripts/gen-seed-blue-ribbon.mjs 로 시드 SQL 재생성')
