// opening_hours_import.json 을 읽어 restaurants.opening_hours 만 id 매칭으로 UPDATE 하는 스크립트.
//
// 안전 철학(backfill-kakao-apply 와 동일):
//   · 기본은 DRY-RUN — 몇 건이 바뀔지 카운트만 출력하고 DB 는 건드리지 않는다.
//   · --apply 플래그가 있을 때만 실제 UPDATE.
//   · import json 에 있는 id 만 UPDATE. json 에 없는 식당(27곳 등)은 절대 손대지 않는다 → opening_hours NULL 유지.
//   · opening_hours 외 다른 컬럼(business_hours 포함)은 절대 건드리지 않는다.
//
// 사전 준비: 먼저 마이그레이션 0011_opening_hours.sql 을 Supabase SQL Editor 에서 실행해 컬럼을 만들 것.
//
// 실행:
//   node --env-file=.env.local scripts/apply-opening-hours.mjs            # dry-run (기본 파일: opening_hours_import.json)
//   node --env-file=.env.local scripts/apply-opening-hours.mjs --apply    # 실제 반영
//
// 입력 파일 지정(선택): 첫 번째 비(非)플래그 인자로 다른 JSON 경로를 줄 수 있다.
//   node --env-file=.env.local scripts/apply-opening-hours.mjs opening_hours_backfill.json          # dry-run
//   node --env-file=.env.local scripts/apply-opening-hours.mjs opening_hours_backfill.json --apply  # 반영
//   → 파일에 든 id 만 UPDATE 하므로 기존 180건은 건드리지 않는다.
//
// 연결: enrich-google-places.mjs 와 동일하게 .env.local 의 Supabase service 키 재사용.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── 환경변수 ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
for (const [name, val] of [
  ['NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY],
]) {
  if (!val) {
    console.error(`✗ 환경변수 ${name} 가 없습니다. node --env-file=.env.local 로 실행하세요.`)
    process.exit(1)
  }
}

const APPLY = process.argv.includes('--apply')
const IN = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'opening_hours_import.json'

if (!existsSync(IN)) {
  console.error(`✗ ${IN} 가 레포 루트에 없습니다.`)
  process.exit(1)
}

// ── 입력 로드/검증 ────────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(resolve(process.cwd(), IN), 'utf8'))
if (!Array.isArray(raw)) {
  console.error(`✗ ${IN} 형식 오류: 최상위가 배열이어야 합니다.`)
  process.exit(1)
}

// id 중복/누락/빈 opening_hours 정리.
const seen = new Set()
const items = []
let badRows = 0
for (const r of raw) {
  if (!r || typeof r.id !== 'string' || r.opening_hours == null || r.opening_hours === '') {
    badRows++
    continue
  }
  if (seen.has(r.id)) continue // 중복 id 는 첫 건만
  seen.add(r.id)
  items.push({ id: r.id, opening_hours: r.opening_hours })
}
console.log(`입력 ${raw.length}건 → 유효 ${items.length}건 (id/opening_hours 누락·중복 제외 ${badRows + (raw.length - badRows - items.length)}건)`)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── 현재 상태 조회 (컬럼 존재 확인 + 변경 예정 카운트 + 미존재 id 탐지) ────────
const ids = items.map((it) => it.id)
const current = new Map() // id → 현재 opening_hours
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, opening_hours')
    .in('id', ids.slice(i, i + 200))
  if (error) {
    if (/opening_hours/.test(error.message) && /column|does not exist|schema cache/i.test(error.message)) {
      console.error(
        `✗ restaurants.opening_hours 컬럼이 없습니다.\n` +
          `  먼저 supabase/migrations/0011_opening_hours.sql 을 Supabase SQL Editor 에서 실행하세요.\n` +
          `  (원본 오류: ${error.message})`,
      )
      process.exit(1)
    }
    console.error('✗ 현재 상태 조회 실패:', error.message)
    process.exit(1)
  }
  for (const row of data) current.set(row.id, row.opening_hours)
}

// 비교: jsonb 에는 문자열이 JSON 스칼라 문자열로 저장된다. 현재값(문자열) === 새값이면 변경 불필요.
const notFound = items.filter((it) => !current.has(it.id)).map((it) => it.id)
const toChange = items.filter((it) => current.has(it.id) && current.get(it.id) !== it.opening_hours)
const unchanged = items.filter((it) => current.has(it.id) && current.get(it.id) === it.opening_hours)

// ── 요약 ──────────────────────────────────────────────────────────────────────
console.log(`\n${APPLY ? '🚀 APPLY 모드 (실제 반영)' : '🔍 DRY-RUN (미리보기 — 아무것도 안 바꿈)'}`)
console.log('── 계획 요약 ──')
console.log(`  DB 에서 매칭됨        : ${items.length - notFound.length}`)
console.log(`  변경될 행(값 다름/NULL): ${toChange.length}`)
console.log(`  이미 동일(변경 불필요) : ${unchanged.length}`)
console.log(`  DB 에 없는 id(스킵)   : ${notFound.length}`)
if (notFound.length) {
  console.log(`    └ 미존재 id 샘플: ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? ' …' : ''}`)
}

// 샘플 미리보기(최대 3건)
console.log('\n── 샘플 (현재 → 변경 후) ──')
for (const it of toChange.slice(0, 3)) {
  const before = current.get(it.id)
  console.log(`  · ${it.id}`)
  console.log(`      현재 : ${before === null ? 'NULL' : String(before).slice(0, 60)}`)
  console.log(`      변경 : ${String(it.opening_hours).slice(0, 60)}…`)
}

if (!APPLY) {
  console.log('\n→ 위 내용이 맞으면 --apply 플래그로 실제 반영하세요.')
  process.exit(0)
}

// ── 실제 반영 ──────────────────────────────────────────────────────────────────
// id 로만 UPDATE → import 에 없는 식당은 원천적으로 영향 없음(NULL 유지).
console.log('\n── 반영 중 ──')
let success = 0
const failed = [] // { id, reason }

for (const it of toChange) {
  const { data, error } = await supabase
    .from('restaurants')
    .update({ opening_hours: it.opening_hours })
    .eq('id', it.id)
    .select('id')
  if (error) {
    failed.push({ id: it.id, reason: error.message })
    console.warn(`  ✗ ${it.id}: ${error.message}`)
  } else if (data.length === 0) {
    failed.push({ id: it.id, reason: 'no row updated (id 불일치?)' })
    console.warn(`  ✗ ${it.id}: 반영된 행 없음`)
  } else {
    success++
  }
}

console.log('\n── 반영 완료 ──')
console.log(`  ✅ 성공        : ${success}`)
console.log(`  ⏭ 변경 불필요  : ${unchanged.length}`)
console.log(`  ⏭ DB 미존재 id : ${notFound.length}`)
console.log(`  ✗ 실패        : ${failed.length}`)
if (failed.length) {
  console.log('  실패 id 목록:')
  for (const f of failed) console.log(`    - ${f.id}: ${f.reason}`)
}
