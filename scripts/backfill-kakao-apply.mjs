// 카카오 백필 [3단계: 반영] 스크립트.
//
// 1단계 fetch 결과(scripts/data/backfill-kakao.json)를 읽어, 검증된 행만 restaurants 에
// UPDATE 한다. 기본은 dry-run(아무것도 안 바꿈) — 무엇이 바뀔지 미리 보여주고, --apply 가
// 있을 때만 실제로 쓴다.
//
// 실행:
//   node --env-file=.env.local scripts/backfill-kakao-apply.mjs            # dry-run (미리보기)
//   node --env-file=.env.local scripts/backfill-kakao-apply.mjs --apply    # 실제 반영
//
// 반영 규칙:
//   · 대상 = auto 등급, 또는 사람이 approved:true 로 바꾼 행.
//     - approved:false 는 명시적 거부 → auto 라도 제외(veto).
//     - review/fail 은 approved:true 일 때만 반영.
//   · phone     : proposed.phone 이 있고 DB phone 이 NULL 일 때만.
//   · category  : proposed.category_slug 가 있고 DB category_id 가 NULL 일 때만.
//                 slug → categories.id 변환(못 찾으면 건너뜀).
//   · 안전 가드 : 실제 UPDATE 는 .is('phone', null) / .is('category_id', null) 조건을 건다.
//     → fetch 이후 사람이 채운 값이 있으면 DB 단에서 0건 처리되어 절대 덮어쓰지 않는다(멱등).

import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

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

const IN = 'scripts/data/backfill-kakao.json'
const APPLY = process.argv.includes('--apply')

if (!existsSync(IN)) {
  console.error(`✗ ${IN} 가 없습니다. 먼저 1단계(backfill-kakao-fetch.mjs)를 실행하세요.`)
  process.exit(1)
}
const records = JSON.parse(readFileSync(IN, 'utf8'))

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// slug → category_id 변환표.
const { data: cats, error: catErr } = await supabase
  .from('categories')
  .select('id, slug')
if (catErr) {
  console.error('✗ categories 조회 실패:', catErr.message)
  process.exit(1)
}
const slugToId = new Map(cats.map((c) => [c.slug, c.id]))

// ── 반영 대상 판정 ─────────────────────────────────────────────────────────────
function eligibility(rec) {
  if (rec.approved === false) return { ok: false, why: 'veto(approved:false)' }
  if (rec.match?.grade === 'auto') return { ok: true }
  if (rec.approved === true) return { ok: true }
  return { ok: false, why: `${rec.match?.grade ?? '?'}/미승인` }
}

// 각 레코드 → 실제로 바꿀 필드 계산(DB 스냅샷이 NULL 인 칸만).
function plan(rec) {
  const fields = {}
  const notes = []
  if (rec.proposed?.phone && rec.db?.phone == null) {
    fields.phone = rec.proposed.phone
  }
  if (rec.proposed?.category_slug && rec.db?.category_id == null) {
    const cid = slugToId.get(rec.proposed.category_slug)
    if (cid != null) fields.category_id = cid
    else notes.push(`slug '${rec.proposed.category_slug}' → id 변환 실패`)
  }
  return { fields, notes }
}

// ── 계획 수집 ──────────────────────────────────────────────────────────────────
const planned = [] // 실제 바꿀 게 있는 행
const skipped = { ineligible: 0, nochange: 0 }

for (const rec of records) {
  const elig = eligibility(rec)
  if (!elig.ok) {
    skipped.ineligible++
    continue
  }
  const { fields, notes } = plan(rec)
  if (Object.keys(fields).length === 0) {
    skipped.nochange++ // 대상이지만 채울 빈칸이 없음(이미 값 있음/제안 없음)
    continue
  }
  planned.push({ rec, fields, notes })
}

const phoneCount = planned.filter((p) => p.fields.phone !== undefined).length
const catCount = planned.filter((p) => p.fields.category_id !== undefined).length

// ── 요약 + 미리보기 ────────────────────────────────────────────────────────────
console.log(`\n${APPLY ? '🚀 APPLY 모드 (실제 반영)' : '🔍 DRY-RUN (미리보기 — 아무것도 안 바꿈)'}`)
console.log('── 계획 요약 ──')
console.log(`  반영할 행      : ${planned.length}`)
console.log(`    · phone 채움 : ${phoneCount}`)
console.log(`    · category 채움: ${catCount}`)
console.log(`  건너뜀(대상아님): ${skipped.ineligible}`)
console.log(`  건너뜀(빈칸없음): ${skipped.nochange}`)

// before/after 샘플 — phone 채우는 것 우선으로 최대 5건.
const samples = [...planned]
  .sort((a, b) => (b.fields.phone !== undefined) - (a.fields.phone !== undefined))
  .slice(0, 5)
console.log('\n── 샘플 (before → after) ──')
for (const p of samples) {
  const g = p.rec.match?.grade
  console.log(`  · ${p.rec.name}  [${g}]`)
  if (p.fields.phone !== undefined) {
    console.log(`      phone      : ${p.rec.db.phone ?? 'NULL'}  →  ${p.fields.phone}`)
  }
  if (p.fields.category_id !== undefined) {
    console.log(
      `      category_id: ${p.rec.db.category_id ?? 'NULL'}  →  ${p.fields.category_id} (${p.rec.proposed.category_slug})`,
    )
  }
}

if (!APPLY) {
  console.log('\n→ 위 내용이 맞으면 --apply 플래그로 실제 반영하세요.')
  process.exit(0)
}

// ── 실제 반영 ──────────────────────────────────────────────────────────────────
// 필드별로 분리 UPDATE + .is(컬럼, null) 가드 → 사람이 채운 값은 DB 단에서 보호(0건 처리).
console.log('\n── 반영 중 ──')
const now = new Date().toISOString()
let appliedPhone = 0
let appliedCat = 0
let blocked = 0 // 가드에 막혀 0건 처리된 경우(이미 값 있음)

for (const p of planned) {
  const id = p.rec.id

  if (p.fields.phone !== undefined) {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ phone: p.fields.phone, updated_at: now })
      .eq('id', id)
      .is('phone', null)
      .select('id')
    if (error) {
      console.log(`  ✗ ${p.rec.name} phone: ${error.message}`)
    } else if (data.length > 0) {
      appliedPhone++
    } else {
      blocked++
      console.log(`  ⏭ ${p.rec.name} phone: 이미 값이 있어 건너뜀(가드)`)
    }
  }

  if (p.fields.category_id !== undefined) {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ category_id: p.fields.category_id, updated_at: now })
      .eq('id', id)
      .is('category_id', null)
      .select('id')
    if (error) {
      console.log(`  ✗ ${p.rec.name} category: ${error.message}`)
    } else if (data.length > 0) {
      appliedCat++
    } else {
      blocked++
      console.log(`  ⏭ ${p.rec.name} category: 이미 값이 있어 건너뜀(가드)`)
    }
  }
}

console.log('\n── 반영 완료 ──')
console.log(`  phone 반영    : ${appliedPhone}`)
console.log(`  category 반영 : ${appliedCat}`)
console.log(`  가드로 건너뜀 : ${blocked}`)
