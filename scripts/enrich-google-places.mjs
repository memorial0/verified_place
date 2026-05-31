// Google Places API (New) 로 식당 영업시간을 인리치먼트하는 스크립트 (read-only).
//
// 흐름(요청 사양):
//   1) name + 주소로 Text Search (POST places:searchText) → place_id 후보
//      - 동명이인 차단: Supabase 에서 좌표(lat/lng)를 id 로 불러와 거리+이름일치로 best 선택
//   2) place_id → Place Details (GET places/{id}) 로 regularOpeningHours·businessStatus·displayName
//
// 입력 : data/restaurants.csv  (id, name, branch_name, sido, sigungu, address_road, address_jibun ...)
// 출력 : data/restaurants-google-hours.csv
//        컬럼: id, name, google_name, business_status, opening_hours, place_id
//        (214곳 전부 출력 — 실패도 빈 값으로 한 줄 남긴다. 침묵 누락 없음)
//        data/google-places-raw.json  — 원본(periods 포함) + resume 용
//
// 실행:
//   node --env-file=.env.local scripts/enrich-google-places.mjs
//
// 환경변수:
//   GOOGLE_MAPS_API_KEY  — Places API (New) 활성화 필요. ⚠️ 서버 전용. 절대 로그/출력에 찍지 않는다.
//   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  — 좌표 로딩용(선택; 없으면 주소 검색만)
//
// 정확한 엔드포인트/필드명은 현재 Google 문서 기준:
//   Text Search : POST https://places.googleapis.com/v1/places:searchText
//                 X-Goog-FieldMask 에 'places.' 접두사 (예: places.id)
//   Place Details: GET https://places.googleapis.com/v1/places/{PLACE_ID}
//                 X-Goog-FieldMask 접두사 없음 (예: regularOpeningHours,businessStatus,displayName)

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── 환경변수 (키는 절대 출력하지 않는다) ─────────────────────────────────────────
const GKEY = process.env.GOOGLE_MAPS_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!GKEY) {
  console.error(
    '✗ GOOGLE_MAPS_API_KEY 가 없습니다. .env.local 에 넣고 Places API (New) 를 활성화하세요.\n' +
      '  실행: node --env-file=.env.local scripts/enrich-google-places.mjs',
  )
  process.exit(1)
}

const IN_CSV = 'data/restaurants.csv'
const OUT_CSV = 'data/restaurants-google-hours.csv'
const RAW_JSON = 'data/google-places-raw.json'

// 조회 파라미터
const SEARCH_RADIUS_M = 2000 // 좌표 있을 때 locationBias 반경
const CALL_DELAY_MS = 150 // 레이트리밋 보호용 호출 간 지연
const MAX_RETRY = 3

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 미니 CSV 파서 (RFC 4180) ──────────────────────────────────────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // BOM
  const rows = []
  let row = []
  let cell = ''
  let i = 0
  let inQuotes = false
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
    } else if (c === ',') {
      row.push(cell)
      cell = ''
      i++
    } else if (c === '\r') {
      i++
    } else if (c === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
    } else {
      cell += c
      i++
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  if (rows.length === 0) return []
  const header = rows[0]
  return rows
    .slice(1)
    .filter((r) => r.some((v) => v !== ''))
    .map((r) => Object.fromEntries(header.map((h, idx) => [h, r[idx] ?? ''])))
}

function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// ── 매칭 헬퍼 ─────────────────────────────────────────────────────────────────
const clean = (s) =>
  String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/[()[\]{}.,\-_!?·'"]/g, '')

function nameMatches(ourName, branchName, placeName) {
  const a = clean(ourName)
  const b = clean(placeName)
  if (!a || !b) return false
  if (b.includes(a) || a.includes(b)) return true
  if (branchName) {
    const ab = clean(ourName + branchName)
    if (b.includes(ab) || ab.includes(b)) return true
  }
  return false
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// 공통 fetch (429/5xx 백오프 재시도, 4xx 는 본문과 함께 throw). 키는 헤더로만 전달.
async function gfetch(url, init) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok) return await res.json()
      if (res.status === 429 || res.status >= 500) {
        await sleep(CALL_DELAY_MS * attempt * 6) // 레이트리밋/일시오류 → 지수 백오프
        continue
      }
      const body = await res.text()
      throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`)
    } catch (err) {
      if (attempt === MAX_RETRY) throw err
      await sleep(CALL_DELAY_MS * attempt * 6)
    }
  }
  throw new Error('재시도 초과')
}

// ── 1단계: Text Search → place_id 후보 ────────────────────────────────────────
async function textSearch(textQuery, coords) {
  const body = {
    textQuery,
    regionCode: 'KR',
    languageCode: 'ko',
    maxResultCount: 8,
  }
  if (coords) {
    body.locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: SEARCH_RADIUS_M,
      },
    }
  }
  // Text Search 필드마스크는 'places.' 접두사를 쓴다.
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
  ].join(',')

  const json = await gfetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GKEY,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  })
  return json.places ?? []
}

// ── 2단계: Place Details → 영업시간/상태/이름 ─────────────────────────────────
async function placeDetails(placeId) {
  // Place Details 필드마스크는 접두사 없이 최상위 필드명.
  const fieldMask = ['id', 'displayName', 'businessStatus', 'regularOpeningHours'].join(',')
  const json = await gfetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GKEY,
        'X-Goog-FieldMask': fieldMask,
      },
    },
  )
  return json
}

// 한 식당 → best 후보 선택.
function pickBest(r, coords, places) {
  const scored = places.map((p) => {
    const placeName = p.displayName?.text ?? ''
    const loc = p.location
    const dist =
      coords && loc ? haversineM(coords.lat, coords.lng, loc.latitude, loc.longitude) : null
    return { p, placeName, dist, nameMatch: nameMatches(r.name, r.branch_name, placeName) }
  })
  const byDist = (a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity)
  const matched = scored.filter((s) => s.nameMatch).sort(byDist)
  return matched[0] ?? [...scored].sort(byDist)[0] ?? null
}

// ── 입력 로드 ─────────────────────────────────────────────────────────────────
const csvText = readFileSync(resolve(process.cwd(), IN_CSV), 'utf8')
const restaurants = parseCsv(csvText)
if (restaurants.length === 0) {
  console.error(`✗ ${IN_CSV} 에서 행을 읽지 못했습니다.`)
  process.exit(1)
}
console.log(`입력 ${restaurants.length}곳 (${IN_CSV})`)

// 좌표 로딩(선택) — 동명이인 차단용.
const coordsById = new Map()
if (SUPABASE_URL && SERVICE_KEY) {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const ids = restaurants.map((r) => r.id).filter(Boolean)
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, latitude, longitude')
      .in('id', ids.slice(i, i + 200))
    if (error) {
      console.warn(`⚠ 좌표 로딩 실패(주소검색으로 진행): ${error.message}`)
      break
    }
    for (const row of data) {
      if (row.latitude != null && row.longitude != null) {
        coordsById.set(row.id, { lat: row.latitude, lng: row.longitude })
      }
    }
  }
  console.log(`좌표 확보: ${coordsById.size}/${restaurants.length}곳`)
} else {
  console.log('⚠ Supabase 키 없음 → 주소 기반 검색만 수행')
}

// ── resume ────────────────────────────────────────────────────────────────────
mkdirSync('data', { recursive: true })
const results = existsSync(RAW_JSON) ? JSON.parse(readFileSync(RAW_JSON, 'utf8')) : []
const done = new Set(results.map((x) => x.id))
const flushRaw = () => writeFileSync(RAW_JSON, JSON.stringify(results, null, 2) + '\n')

const counts = { ok: 0, no_hours: 0, no_candidate: 0, error: 0, skipped: done.size }

for (const r of restaurants) {
  if (done.has(r.id)) continue

  const coords = coordsById.get(r.id) || null
  const addr = r.address_road || r.address_jibun || ''
  const textQuery = [r.name, addr || r.sigungu].filter(Boolean).join(' ').trim()

  // 행 골격(실패해도 id/name 은 항상 남긴다).
  const rec = {
    id: r.id,
    name: r.name,
    google_name: '',
    business_status: '',
    opening_hours: '',
    place_id: '',
    _status: '',
    _raw: null,
  }

  try {
    // 1) Text Search
    const places = await textSearch(textQuery, coords)
    if (places.length === 0) {
      rec._status = 'no_candidate'
      counts.no_candidate++
      console.log(`❌ ${String(r.name).padEnd(14)} 후보 없음`)
    } else {
      const best = pickBest(r, coords, places)
      rec.place_id = best.p.id

      // 2) Place Details
      await sleep(CALL_DELAY_MS)
      const det = await placeDetails(best.p.id)
      rec.google_name = det.displayName?.text ?? best.placeName ?? ''
      rec.business_status = det.businessStatus ?? ''
      const weekday = det.regularOpeningHours?.weekdayDescriptions ?? null
      const hasHours = Array.isArray(weekday) && weekday.length > 0
      rec.opening_hours = hasHours ? weekday.join(' | ') : ''
      rec._raw = det.regularOpeningHours ?? null
      rec._status = hasHours ? 'ok' : 'no_hours'

      if (hasHours) counts.ok++
      else counts.no_hours++

      const dist = best.dist != null ? `${Math.round(best.dist)}m` : '-'
      const tag = hasHours ? '🕒' : '⏳'
      console.log(
        `${tag} ${String(r.name).padEnd(14)} ${rec.business_status.padEnd(12)} ` +
          `dist=${dist.padStart(6)} ${hasHours ? weekday.length + '일' : '시간없음'}`,
      )
    }
  } catch (err) {
    // 레이트리밋·실패는 건너뛰되 로그를 남긴다(키는 절대 안 찍힘).
    rec._status = 'error'
    rec._error = err.message
    counts.error++
    console.warn(`⚠ ${String(r.name).padEnd(14)} 건너뜀: ${err.message}`)
  }

  results.push(rec)
  flushRaw() // 매 건 flush → 중간에 끊겨도 재실행 시 이어서 진행
  await sleep(CALL_DELAY_MS)
}

// ── 출력 CSV (요청 컬럼 순서 그대로) ──────────────────────────────────────────
const OUT_COLUMNS = ['id', 'name', 'google_name', 'business_status', 'opening_hours', 'place_id']
const header = OUT_COLUMNS.map(csvCell).join(',')
const bodyCsv = results
  .map((x) => OUT_COLUMNS.map((c) => csvCell(x[c])).join(','))
  .join('\n')
writeFileSync(resolve(process.cwd(), OUT_CSV), '﻿' + header + '\n' + bodyCsv + '\n', 'utf8')

console.log('\n── 요약 ──')
console.log(`총 결과        : ${results.length}곳`)
console.log(`  🕒 영업시간 확보 : ${counts.ok}`)
console.log(`  ⏳ 매칭됐으나 시간없음: ${counts.no_hours}`)
console.log(`  ❌ 후보 없음     : ${counts.no_candidate}`)
console.log(`  ⚠ 오류로 건너뜀  : ${counts.error}`)
if (counts.skipped) console.log(`  ⏭ 이전 실행분(resume): ${counts.skipped}`)
console.log(`\n→ CSV : ${OUT_CSV}`)
console.log(`→ 원본: ${RAW_JSON}`)
