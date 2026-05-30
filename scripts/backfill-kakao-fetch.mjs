// 카카오 Local API 로 식당의 phone·category 를 백필하기 위한 [1단계: 조회] 스크립트.
//
// 이 스크립트는 DB 를 절대 수정하지 않는다(read-only). 카카오 조회 결과를 등급과 함께
// scripts/data/backfill-kakao.json 으로 떨군다. 사람이 그 파일을 눈으로 검토(2단계)한 뒤,
// 별도 apply 스크립트(3단계)가 승인된 행만 DB 에 UPDATE 한다.
//
// 실행:
//   node --env-file=.env.local scripts/backfill-kakao-fetch.mjs
//
// 동작 요약:
//   1) restaurants 에서 phone 또는 category_id 가 비어 있는 행만 읽는다(이미 채워진 건 호출 낭비).
//   2) 각 식당을 카카오 키워드 검색 — 우리가 이미 가진 좌표로 공간 바운딩(반경 검색)하여
//      동명이인을 원천 차단하고, 거리 최소 후보를 고른다.
//   3) 거리/이름일치로 confident('auto') / review / fail 등급을 매긴다.
//   4) phone(빈칸이면 채움 제안)·category_slug(카카오 분류 → 우리 6분류 매핑) 제안값을 적는다.
//   5) 결과를 매 건마다 파일에 flush → 중간에 끊겨도 재실행하면 남은 것만 이어서 조회(idempotent).
//
// ⚠️ category 매핑 사전(KAKAO_CATEGORY_MAP)은 "시작점"이다. 1단계 결과의 category_name 분포를
//    실제로 본 뒤 사전을 보강하는 것을 전제로 한다. 매핑 안 되는 건 억지로 넣지 않고 NULL 로 둔다.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── 환경변수 ──────────────────────────────────────────────────────────────────
const KAKAO_KEY = process.env.KAKAO_REST_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

for (const [name, val] of [
  ['KAKAO_REST_KEY', KAKAO_KEY],
  ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
]) {
  if (!val) {
    console.error(`✗ 환경변수 ${name} 가 없습니다. node --env-file=.env.local 로 실행하세요.`)
    process.exit(1)
  }
}

const OUT = 'scripts/data/backfill-kakao.json'

// 조회 파라미터(필요시 상단에서만 조정)
const SEARCH_RADIUS_M = 500 // 1차 반경. 후보 0이면 BROAD_RADIUS_M 로 한 번 더.
const BROAD_RADIUS_M = 2000
const CALL_DELAY_MS = 150 // 카카오 QPS 보호용 호출 간 지연
const MAX_RETRY = 3

// 등급 임계값(미터)
const AUTO_MAX_DIST = 50 // 이름일치 + 이 거리 이내 → auto(확실)
const REVIEW_MAX_DIST = 300 // 이 거리 이내 → review(의심)
const REVIEW_NAME_DIST = 500 // 이름일치면 이 거리까지 review 로 끌어올림

// ── 카카오 분류 → 우리 categories.slug 매핑(시작점, 데이터 보고 보강 전제) ─────
// 카카오 category_name 예: "음식점 > 한식 > 국밥", "음식점 > 카페 > 커피전문점".
// 아래 토큰이 분류 문자열 안에 들어 있으면 해당 slug 로 매핑. 못 맞추면 NULL(수동 영역).
// fine_dining 은 카카오 분류로 판별 불가 → 자동 매핑 대상에서 제외.
const KAKAO_CATEGORY_MAP = [
  [['한식'], 'korean'],
  [['일식', '일본', '초밥', '스시', '돈가스', '라멘', '우동'], 'japanese'],
  [['중식', '중국'], 'chinese'],
  [['양식', '이탈리', '프렌치', '스테이크', '파스타', '피자'], 'western'],
  [['카페', '커피', '디저트', '베이커리', '제과', '빵'], 'cafe_dessert'],
]

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
const clean = (s) =>
  String(s ?? '')
    .replace(/\s+/g, '')
    .replace(/[()[\]{}.,\-_!?·'"]/g, '')

// 카카오에 보낼 "검색어"만 정규화한다(노이즈 토큰 제거 → 검색 적중률↑).
// ⚠️ 이 함수는 오직 검색어 생성에만 쓰인다. 매칭 비교(nameMatches)는 원본 name 을 그대로
//    써서, 기존 auto 매칭의 등급 판정이 바뀌지 않도록 한다.
function searchQuery(name) {
  const q = String(name ?? '')
    .replace(/주식회사|㈜|\(주\)/g, ' ') // 법인 접두/접미
    .replace(/\([^)]*\)/g, ' ') // 괄호 부속어: (벳), (춘천점) 등
    .replace(/\d+\s*호점/g, ' ') // N호점
    .replace(/본점|분점/g, ' ') // 본점/분점
    .replace(/\s+/g, ' ')
    .trim()
  // 토큰만 있던 이름이라 전부 지워졌으면 원본으로 폴백.
  return q || String(name ?? '').trim()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 두 좌표 사이 거리(미터) — Haversine.
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

// 우리 이름과 카카오 place_name 의 부분일치 여부(공백/기호 제거 후 포함 관계).
function nameMatches(ourName, branchName, placeName) {
  const a = clean(ourName)
  const b = clean(placeName)
  if (!a || !b) return false
  if (b.includes(a) || a.includes(b)) return true
  // 지점명을 합친 형태도 시도("본점", "강남점" 등 차이 흡수)
  if (branchName) {
    const ab = clean(ourName + branchName)
    if (b.includes(ab) || ab.includes(b)) return true
  }
  return false
}

// 카카오 category_name → 우리 slug. 못 맞추면 null.
function mapCategory(categoryName) {
  const c = String(categoryName ?? '')
  for (const [tokens, slug] of KAKAO_CATEGORY_MAP) {
    if (tokens.some((t) => c.includes(t))) return slug
  }
  return null
}

// 카카오 키워드 검색(재시도 포함). 좌표 기반 반경 검색 + 거리순 정렬.
async function kakaoSearch(query, lng, lat, radius) {
  const qs = new URLSearchParams({
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    sort: 'distance',
    size: '15',
  }).toString()
  // category_group_code 는 일부러 안 건다 — 음식점(FD6) 뿐 아니라 카페(CE7)도 잡기 위함.
  // 동명이인 차단은 좌표 반경 + 이름일치가 담당한다.
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${qs}`
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
      if (res.ok) return (await res.json()).documents ?? []
      if (res.status === 429 || res.status >= 500) {
        await sleep(CALL_DELAY_MS * attempt * 4) // 지수 백오프
        continue
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (attempt === MAX_RETRY) throw err
      await sleep(CALL_DELAY_MS * attempt * 4)
    }
  }
  return []
}

// 한 식당 → 카카오 후보 선정 + 등급.
async function resolve(r) {
  const lat = r.latitude
  const lng = r.longitude
  if (lat == null || lng == null) {
    return { kakao: null, match: { grade: 'fail', reason: 'no_db_coords', candidatesCount: 0 } }
  }

  const query = searchQuery(r.name) // 검색어만 정규화. 매칭 비교는 아래에서 원본 r.name 사용.
  let docs = await kakaoSearch(query, lng, lat, SEARCH_RADIUS_M)
  if (docs.length === 0) {
    await sleep(CALL_DELAY_MS)
    docs = await kakaoSearch(query, lng, lat, BROAD_RADIUS_M)
  }
  if (docs.length === 0) {
    return {
      kakao: null,
      match: { grade: 'fail', reason: 'no_candidate', candidatesCount: 0, search_query: query },
    }
  }

  // sort=distance 라 docs[0]가 최근접. 다만 이름일치하는 더 가까운 후보가 있으면 그쪽 우선.
  const scored = docs.map((d) => {
    const dist = haversineM(lat, lng, Number(d.y), Number(d.x))
    return { d, dist, nameMatch: nameMatches(r.name, r.branch_name, d.place_name) }
  })
  const matched = scored.filter((s) => s.nameMatch).sort((a, b) => a.dist - b.dist)
  const best = matched[0] ?? scored.sort((a, b) => a.dist - b.dist)[0]

  const distance = Math.round(best.dist)
  let grade
  if (best.dist <= AUTO_MAX_DIST && best.nameMatch) grade = 'auto'
  else if (best.dist <= REVIEW_MAX_DIST || (best.nameMatch && best.dist <= REVIEW_NAME_DIST))
    grade = 'review'
  else grade = 'fail'

  const d = best.d
  return {
    kakao: {
      place_id: d.id,
      place_name: d.place_name,
      phone: d.phone ? d.phone : null,
      category_name: d.category_name,
      road_address: d.road_address_name || d.address_name || null,
      lat: Number(d.y),
      lng: Number(d.x),
      place_url: d.place_url,
    },
    match: {
      grade,
      distance_m: distance,
      name_match: best.nameMatch,
      candidatesCount: docs.length,
      search_query: query,
    },
  }
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// phone 또는 category_id 가 비어 있는 행만(이미 채워진 건 건드릴 필요도, 조회할 이유도 없음).
const { data: rows, error } = await supabase
  .from('restaurants')
  .select('id, name, branch_name, latitude, longitude, address_road, sigungu, phone, category_id')
  .or('phone.is.null,category_id.is.null')
  .order('created_at', { ascending: true })

if (error) {
  console.error('✗ restaurants 조회 실패:', error.message)
  process.exit(1)
}
console.log(`대상 ${rows.length}곳 (phone 또는 category_id 가 비어 있는 식당)`)

// 재실행 시 이미 조회한 id 는 건너뛴다(resume).
mkdirSync('scripts/data', { recursive: true })
const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []
const done = new Set(results.map((x) => x.id))
const flush = () => writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n')

let processed = 0
const counts = { auto: 0, review: 0, fail: 0, skipped: done.size }

for (const r of rows) {
  if (done.has(r.id)) continue

  let resolved
  try {
    resolved = await resolve(r)
  } catch (err) {
    resolved = { kakao: null, match: { grade: 'fail', reason: err.message, candidatesCount: 0 } }
  }

  // 제안값: 비어 있는 칸만 채운다(이미 값 있는 칸은 제안 자체를 비움 → 3단계에서 안 건드림).
  const proposed = {
    phone: r.phone == null && resolved.kakao?.phone ? resolved.kakao.phone : null,
    category_slug:
      r.category_id == null && resolved.kakao ? mapCategory(resolved.kakao.category_name) : null,
  }
  proposed.category_unmapped =
    r.category_id == null && resolved.kakao != null && proposed.category_slug == null

  results.push({
    id: r.id,
    name: r.name,
    branch_name: r.branch_name,
    db: {
      lat: r.latitude,
      lng: r.longitude,
      address_road: r.address_road,
      sigungu: r.sigungu,
      phone: r.phone,
      category_id: r.category_id,
    },
    kakao: resolved.kakao,
    match: resolved.match,
    proposed,
    // 검토(2단계)에서 사람이 채우는 칸: 'auto' 는 기본 통과로 간주, 'review'/'fail' 은
    // approved 를 true 로 바꿔야 3단계가 반영한다. (3단계 규칙은 apply 스크립트에서 확정)
    approved: null,
  })

  counts[resolved.match.grade] = (counts[resolved.match.grade] ?? 0) + 1
  processed++
  flush() // 매 건 flush — 중간에 끊겨도 안전.

  const tag =
    resolved.match.grade === 'auto' ? '✅' : resolved.match.grade === 'review' ? '🟡' : '❌'
  const dist = resolved.match.distance_m != null ? `${resolved.match.distance_m}m` : '-'
  console.log(
    `${tag} ${String(r.name).padEnd(14)} ${resolved.match.grade.padEnd(6)} ` +
      `dist=${dist.padStart(6)} phone=${proposed.phone ?? '-'} cat=${proposed.category_slug ?? (proposed.category_unmapped ? '?' : '-')}`,
  )

  await sleep(CALL_DELAY_MS)
}

console.log('\n── 요약 ──')
console.log(`이번 실행 처리: ${processed}곳`)
console.log(`  ✅ auto(확실)  : ${counts.auto}`)
console.log(`  🟡 review(의심): ${counts.review}`)
console.log(`  ❌ fail(실패)  : ${counts.fail}`)
console.log(`  ⏭  skip(기존) : ${counts.skipped}`)
console.log(`\n→ ${OUT} 검토 후, 3단계 apply 스크립트로 반영하세요.`)
