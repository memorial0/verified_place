// 춘천 정부 공개데이터(착한가격업소·백년가게) + 블루리본 큐레이션 → 소스별 geocoded JSON
//
// 실행:
//   KAKAO_REST_KEY=... node scripts/import-chuncheon.mjs --source good_price --file data/raw/good-price.csv
//   KAKAO_REST_KEY=... node scripts/import-chuncheon.mjs --source centennial --file data/raw/baengnyeon.csv
//   KAKAO_REST_KEY=... node scripts/import-chuncheon.mjs --source blue_ribbon --file data/raw/blue-ribbon-chuncheon.json
//
// 정부 CSV는 대개 CP949(euc-kr) 인코딩 → 자동 감지/디코딩.
// 춘천만 선필터 → 음식점만(착한가격업소) → 주소 우선 카카오 지오코딩 → 격리(강원 밖) → JSON 저장.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// ── args ─────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]])
    return acc
  }, []),
)
const SOURCE = args.source
const FILE = args.file
const YEAR = Number(args.year ?? 2025)
const KEY = process.env.KAKAO_REST_KEY

const CONFIG = {
  good_price: {
    out: 'src/lib/data/good-price-chuncheon.geocoded.json',
    name: ['업소명', '상호', '상호명', '업체명'],
    addr: ['소재지도로명주소', '도로명주소', '주소', '소재지', '사업장주소'],
    phone: ['전화번호', '연락처', '업소전화번호'],
    biz: ['업종', '업태'],
    sido: ['시도', '시도명', '광역시도'],
    sigungu: ['시군구', '시군구명'],
    meta: { menu: ['착한가격메뉴', '주요품목', '착한메뉴', '품목'] },
    foodOnly: true,
  },
  centennial: {
    out: 'src/lib/data/centennial-chuncheon.geocoded.json',
    name: ['가게명', '업체명', '상호', '상호명', '업소명'],
    addr: ['기본주소', '도로명주소', '주소'],
    addrDetail: ['상세주소'],
    phone: ['연락처', '전화번호'],
    biz: ['카테고리', '주요사업', '업종'],
    sido: ['시도', '시도명'],
    sigungu: ['시군구', '시군구명'],
    meta: { desc: ['설명'], biz: ['주요사업'] },
    foodOnly: false, // 백년가게는 음식점 위주이나 일부 비요식 포함 가능 → 지오코딩 결과 카테고리로 판단
  },
  blue_ribbon: {
    out: 'src/lib/data/blue-ribbon-chuncheon.geocoded.json',
    name: ['nameKo', '상호', '상호명', '업체명'],
    addr: ['address', '주소', '도로명주소'],
    ribbon: ['ribbons', '리본'],
    foodOnly: false,
  },
}

if (!SOURCE || !CONFIG[SOURCE]) {
  console.error('--source 는 good_price|centennial|blue_ribbon 중 하나여야 합니다')
  process.exit(1)
}
if (!FILE || !existsSync(FILE)) {
  console.error(`파일 없음: ${FILE}`)
  process.exit(1)
}
const cfg = CONFIG[SOURCE]

// ── 디코딩 (UTF-8 우선, 깨지면 EUC-KR) ─────────────────────────────────────────
function decode(buf) {
  let t = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  if (t.includes('�')) {
    try {
      t = new TextDecoder('euc-kr').decode(buf)
    } catch {
      console.error('euc-kr 디코딩 불가 → `npm i -D iconv-lite` 후 보강 필요')
    }
  }
  return t.replace(/^﻿/, '') // BOM 제거
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
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  const headers = (rows.shift() ?? []).map((h) => h.trim())
  return rows
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])))
}

// 헤더 후보군 중 첫 매칭 컬럼값 (부분 일치)
function pick(rec, candidates) {
  const keys = Object.keys(rec)
  for (const cand of candidates) {
    const k = keys.find((h) => h === cand) ?? keys.find((h) => h.includes(cand))
    if (k && rec[k]) return rec[k].trim()
  }
  return ''
}

const FOOD_RE = /(한식|중식|일식|양식|분식|음식|식당|국밥|국수|곰탕|냉면|고기|치킨|피자|카페|제과|베이커리|디저트|커피|횟집|회|초밥|돈가스|찌개|백반|뷔페|레스토랑|food|restaurant)/i
function bizToSlug(s = '') {
  if (/한식|분식|국밥|국수|곰탕|냉면|백반|찌개|고기/.test(s)) return 'korean'
  if (/일식|초밥|돈가스|스시/.test(s)) return 'japanese'
  if (/중식|중국/.test(s)) return 'chinese'
  if (/양식|이탈리|프랑스|스테이크|피자|파스타/.test(s)) return 'western'
  if (/카페|제과|베이커리|디저트|커피/.test(s)) return 'cafe_dessert'
  return null
}

// ── 입력 로드 ─────────────────────────────────────────────────────────────────
const raw = FILE.endsWith('.json')
  ? JSON.parse(decode(readFileSync(FILE)))
  : parseCsv(decode(readFileSync(FILE)))

// 춘천 선필터
function isChuncheon(rec) {
  const sigungu = pick(rec, cfg.sigungu ?? [])
  const addr = pick(rec, cfg.addr ?? [])
  return sigungu.includes('춘천') || addr.includes('춘천')
}
let rows = raw.filter(isChuncheon)
if (cfg.foodOnly) rows = rows.filter((r) => FOOD_RE.test(pick(r, cfg.biz)))
console.log(`입력 ${raw.length}행 → 춘천 ${rows.length}행 (source=${SOURCE})`)

// ── 카카오 지오코딩 ───────────────────────────────────────────────────────────
async function kakao(path, params) {
  if (!KEY) throw new Error('KAKAO_REST_KEY 없음')
  const qs = new URLSearchParams(params).toString()
  const r = await fetch(`https://dapi.kakao.com/v2/local/${path}?${qs}`, {
    headers: { Authorization: `KakaoAK ${KEY}` },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()).documents ?? []
}
async function geocode(name, address) {
  // 1) 주소 검색 우선
  if (address) {
    const d = (await kakao('search/address.json', { query: address, size: 1 }))[0]
    if (d) return {
      placeName: name,
      addressRoad: d.road_address?.address_name || d.address_name,
      category: '음식점',
      lat: Number(d.y), lng: Number(d.x),
    }
  }
  // 2) 키워드(상호+춘천) 폴백 — 강원 결과 우선
  const docs = await kakao('search/keyword.json', {
    query: `${name} 춘천`, category_group_code: 'FD6', size: 5,
  })
  const d = docs.find((x) => (x.road_address_name || x.address_name || '').startsWith('강원')) ?? docs[0]
  if (!d) return null
  return {
    placeName: d.place_name,
    addressRoad: d.road_address_name || d.address_name,
    category: d.category_name,
    lat: Number(d.y), lng: Number(d.x),
  }
}

const norm = (s) => String(s).replace(/\s+/g, '')
const out = [], pending = []
for (const rec of rows) {
  const name = pick(rec, cfg.name)
  if (!name) continue
  const detail = cfg.addrDetail ? pick(rec, cfg.addrDetail) : ''
  const address = [pick(rec, cfg.addr), detail].filter(Boolean).join(' ').trim()
  const biz = cfg.biz ? pick(rec, cfg.biz) : ''
  // 지오코딩 질의용: 법정동 괄호 표기 "(효자동)" 제거
  const addrQuery = address.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim()
  try {
    const geo = await geocode(name, addrQuery || null)
    if (!geo) { console.log(`❌ ${name} — 결과 없음`); pending.push({ name, address, reason: 'no-result' }); continue }
    if (!geo.addressRoad?.startsWith('강원')) {
      console.log(`⚠️  ${name} → ${geo.addressRoad} (강원 밖, 격리)`); pending.push({ name, address, got: geo.addressRoad }); continue
    }
    const metadata = {}
    for (const [k, cands] of Object.entries(cfg.meta ?? {})) {
      const v = pick(rec, cands); if (v) metadata[k] = v
    }
    out.push({
      source: SOURCE,
      nameKo: name,
      ribbons: cfg.ribbon ? Number(pick(rec, cfg.ribbon)) || undefined : undefined,
      year: YEAR,
      sido: '강원특별자치도',
      sigungu: '춘천시',
      placeName: geo.placeName,
      addressRoad: geo.addressRoad,
      category: bizToSlug(biz) && geo.category === '음식점'
        ? `음식점 > ${biz}` : geo.category,
      phone: cfg.phone ? pick(rec, cfg.phone) : '',
      lat: geo.lat,
      lng: geo.lng,
      externalId: `${SOURCE}-춘천-${norm(name)}`,
      metadata,
    })
    console.log(`✅ ${name.padEnd(14)} → ${geo.addressRoad}`)
  } catch (e) {
    console.log(`⚠️  ${name}: ${e.message}`); pending.push({ name, address, reason: e.message })
  }
}

mkdirSync(dirname(cfg.out), { recursive: true })
writeFileSync(cfg.out, JSON.stringify(out, null, 2) + '\n')
console.log(`\n💾 ${out.length}곳 저장 → ${cfg.out} (격리 ${pending.length}곳)`)
if (pending.length) console.log('격리:', pending.map((p) => p.name).join(', '))
console.log('다음: node scripts/gen-seed-chuncheon.mjs 로 시드 생성')
