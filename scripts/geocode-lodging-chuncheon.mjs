// 춘천시 숙박업소 공공데이터(강원특별자치도 춘천시_숙박업소_20250717.csv)를
// Kakao Local API 로 보강한다. 비용 0원(카카오 무료 한도) 범위만 사용.
//
// 채우는 것:
//   · 좌표(위경도)   ← Kakao 주소검색(거의 100%). 실패 시 키워드검색 좌표로 폴백.
//   · 카테고리/전화   ← Kakao 키워드검색(춘천 내 매칭만). CSV 전화 우선, 없으면 키워드 전화.
// 안 채우는 것: 평점·사진(Google 유료), 체크인/가격/편의시설(공식 경로 없음).
//
// 안전 철학: DB 는 절대 건드리지 않는다. 검토용 산출물 2개만 생성.
//   · src/lib/data/lodging-chuncheon.geocoded.json  (good-price 와 동일 구조, 추후 적재용)
//   · data/raw/lodging-chuncheon.review.csv          (엑셀 눈검증용, UTF-8 BOM)
//
// 실행:
//   node --env-file=.env.local scripts/geocode-lodging-chuncheon.mjs
//   (또는) KAKAO_REST_KEY=... node scripts/geocode-lodging-chuncheon.mjs

import { writeFileSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const KEY = process.env.KAKAO_REST_KEY
if (!KEY) {
  console.error('✗ KAKAO_REST_KEY 없음. node --env-file=.env.local 로 실행하세요.')
  process.exit(1)
}

const SRC = '강원특별자치도 춘천시_숙박업소_20250717.csv'
const REF_DATE = '2025-07-17'

// ── CP949 CSV → UTF-8 문자열 (iconv 사용; node 는 CP949 기본 미지원) ───────────
let text
try {
  text = execSync(`iconv -f CP949 -t UTF-8 "${SRC}"`, { maxBuffer: 1 << 24 }).toString()
} catch {
  console.error(`✗ ${SRC} 를 읽지 못했습니다(레포 루트에 있어야 함).`)
  process.exit(1)
}

// ── 따옴표/쉼표 대응 미니 CSV 파서 ──────────────────────────────────────────────
function parseCsv(s) {
  const rows = []
  let row = [], cur = '', q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows
}

const rows = parseCsv(text).filter((r) => r.length >= 5 && r[1])
const header = rows.shift() // 업태,업소명,영업소주소,소재지전화,데이터기준일자
console.log(`입력 ${rows.length}건 (헤더: ${header.join(' / ')})`)

// ── 전화 정규화: 숫자/하이픈만, 유효(숫자 9개+)할 때만 ─────────────────────────
function normPhone(raw) {
  if (!raw) return null
  const t = raw.replace(/[^\d-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return (t.replace(/-/g, '').length >= 9) ? t : null
}

// ── 주소에서 시도/시군구, 그리고 지오코딩용 깨끗한 주소 추출 ─────────────────────
function parseAddr(addr) {
  const sido = (addr.match(/^(\S+(?:특별자치도|특별시|광역시|도))/) || [])[1] || ''
  const sigungu = (addr.match(/(\S+시|\S+군)/) || [])[1] || ''
  // 지오코딩용: 첫 쉼표 이후(층/호/필지) 제거 + 괄호(법정동) 제거
  const clean = addr.split(',')[0].replace(/\(.*?\)/g, '').trim()
  return { sido, sigungu, clean }
}

// ── Kakao ─────────────────────────────────────────────────────────────────────
async function kakaoAddress(query) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  if (!res.ok) throw new Error(`addr HTTP ${res.status}`)
  return (await res.json()).documents?.[0] ?? null
}
async function kakaoKeyword(name) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('춘천 ' + name)}&size=5`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  if (!res.ok) throw new Error(`kw HTTP ${res.status}`)
  const docs = (await res.json()).documents ?? []
  return docs.find((d) => (d.address_name || '').includes('춘천')) ?? null
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 보강 루프 ──────────────────────────────────────────────────────────────────
const out = []
let nCoord = 0, nFromAddr = 0, nFromKw = 0, nNoCoord = 0, nCat = 0, nPhone = 0
for (const r of rows) {
  const bizType = (r[0] || '').trim()
  const name = (r[1] || '').trim()
  const addrRaw = (r[2] || '').trim()
  const csvPhone = normPhone(r[3])
  const { sido, sigungu, clean } = parseAddr(addrRaw)

  let lat = null, lng = null, geocodeSource = 'none'
  let category = null, kwPhone = null, placeName = name

  try {
    const a = await kakaoAddress(clean)
    if (a) { lat = Number(a.y); lng = Number(a.x); geocodeSource = 'kakao-address'; nFromAddr++ }
  } catch (e) { /* 폴백 시도 */ }
  await sleep(40)

  try {
    const k = await kakaoKeyword(name)
    // 오매칭 가드: 키워드 결과가 '숙박' 카테고리일 때만 신뢰(카테고리/전화 채택).
    // 복권방·화장품 등 동명 비숙박 POI 가 잡히면 카테고리/키워드전화를 버린다(CSV 전화만 유지).
    const isLodging = k && /숙박/.test(k.category_name || '')
    if (isLodging) {
      category = k.category_name || null
      kwPhone = normPhone(k.phone)
      placeName = k.place_name || name
      // 좌표 폴백도 '숙박' 매칭일 때만(엉뚱한 좌표 방지).
      if (lat == null) { lat = Number(k.y); lng = Number(k.x); geocodeSource = 'kakao-keyword'; nFromKw++ }
    }
  } catch (e) { /* 무시 */ }
  await sleep(40)

  const phone = csvPhone || kwPhone || null
  if (lat != null) nCoord++; else nNoCoord++
  if (category) nCat++
  if (phone) nPhone++

  out.push({
    source: 'lodging',
    nameKo: name,
    bizType,
    year: 2025,
    sido,
    sigungu,
    placeName,
    addressRoad: addrRaw,
    category,
    phone,
    lat,
    lng,
    externalId: `lodging-춘천-${name}`,
    referenceDate: REF_DATE,
    geocodeSource,
  })

  const flag = lat == null ? '❌' : geocodeSource === 'kakao-keyword' ? '⚠️ ' : '✅'
  console.log(`${flag}${name.padEnd(16).slice(0, 16)} | ${bizType.padEnd(8)} | ${category ?? '-'} | ${phone ?? '전화없음'}`)
}

// ── 저장 ───────────────────────────────────────────────────────────────────────
const JSON_OUT = 'src/lib/data/lodging-chuncheon.geocoded.json'
writeFileSync(JSON_OUT, JSON.stringify(out, null, 2) + '\n')

mkdirSync('data/raw', { recursive: true })
const esc = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const cols = ['nameKo', 'bizType', 'addressRoad', 'phone', 'category', 'lat', 'lng', 'geocodeSource']
const csvOut =
  '﻿' + cols.join(',') + '\n' +
  out.map((o) => cols.map((c) => esc(o[c])).join(',')).join('\n') + '\n'
const CSV_OUT = 'data/raw/lodging-chuncheon.review.csv'
writeFileSync(CSV_OUT, csvOut)

// ── 요약 ───────────────────────────────────────────────────────────────────────
console.log('\n── 보강 요약 ──')
console.log(`  총 ${out.length}곳`)
console.log(`  좌표 채움      : ${nCoord} (주소검색 ${nFromAddr} + 키워드폴백 ${nFromKw})`)
console.log(`  좌표 실패      : ${nNoCoord}`)
console.log(`  카테고리 채움  : ${nCat}`)
console.log(`  전화 채움      : ${nPhone}`)
console.log(`\n💾 ${JSON_OUT}`)
console.log(`💾 ${CSV_OUT}  (엑셀 검증용)`)
if (nNoCoord) {
  console.log(`\n⚠️ 좌표 실패 ${nNoCoord}곳 (수동 확인 필요):`)
  for (const o of out.filter((x) => x.lat == null)) console.log(`   - ${o.nameKo} | ${o.addressRoad}`)
}
