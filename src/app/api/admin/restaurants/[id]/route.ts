import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin/auth'

export const runtime = 'edge'

/**
 * PATCH /api/admin/restaurants/:id
 *
 * 인증/인가:
 *   middleware 가 /api/admin/* 진입 전에 이미 세션+admin 검사. 여기서 한 번 더
 *   getAdminUser() 로 재검증 (defense in depth).
 *
 * 본문 검증:
 *   화이트리스트 필드만 통과. 다른 키는 조용히 무시.
 *   - name: 문자열. trim 후 빈 값이면 거부(400) — not null 컬럼이라 null 불가.
 *   - branch_name / tagline / reason_to_visit / phone / description: 문자열. trim 후 빈 값이면 null.
 *   - status: ALLOWED_STATUS 집합에 포함될 때만 통과.
 *   - business_hours: 객체. 허용 키만, 값은 trim 된 문자열만, 길이 제한 100자.
 *
 * 부가 동작:
 *   - name 이 실제로 바뀌면 name_en/ja/zh 를 null 로 초기화 → stale 다국어 표기 노출 방지
 *     (displayName 이 name 으로 폴백). 외부 지도 링크도 name(ko) 기준이라 정합성 유지.
 *   - 실제로 바뀐 필드마다 restaurant_edit_log 에 1행씩 감사 기록(no-op 은 기록 안 함).
 */

const ALLOWED_TOP = new Set([
  'name',
  'branch_name',
  'tagline',
  'reason_to_visit',
  'phone',
  'description',
  'status',
  'business_hours',
] as const)

const ALLOWED_STATUS = new Set(['draft', 'published', 'archived', 'flagged'])

const ALLOWED_HOURS_KEYS = new Set([
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
  'note',
  'source',
])

const MAX_LEN: Record<string, number> = {
  name: 200,
  branch_name: 100,
  tagline: 500,
  reason_to_visit: 1000,
  phone: 30,
  description: 2000,
}

// name 변경 시 stale 방지를 위해 함께 비울 다국어 컬럼.
const NAME_I18N_COLS = ['name_en', 'name_ja', 'name_zh'] as const

type Params = Promise<{ id: string }>

// 객체(JSONB)까지 안정 비교 — 키 순서 무관.
function canonical(v: unknown): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const sorted = Object.entries(v as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    )
    return JSON.stringify(sorted)
  }
  return JSON.stringify(v ?? null)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == null && b == null
  if (typeof a === 'object' || typeof b === 'object') return canonical(a) === canonical(b)
  return a === b
}

// 감사 로그 저장용 텍스트화(객체는 직렬화, null 은 null 유지).
function toText(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function normalizeHours(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const filtered: Record<string, string> = {}
  for (const [hk, hv] of Object.entries(v as Record<string, unknown>)) {
    if (!ALLOWED_HOURS_KEYS.has(hk)) continue
    if (typeof hv !== 'string') continue
    const trimmed = hv.trim()
    if (trimmed) filtered[hk] = trimmed.slice(0, 100)
  }
  return filtered
}

export async function PATCH(req: NextRequest, ctx: { params: Params }) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 업데이트 전 현재 값 — no-op 판정 + 감사 old_value 용.
  const { data: current, error: readErr } = await admin
    .from('restaurants')
    .select(
      'id, name, branch_name, tagline, reason_to_visit, phone, description, status, business_hours, name_en, name_ja, name_zh, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }
  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, unknown> = {}
  const audit: { field: string; old_value: string | null; new_value: string | null }[] = []
  let sawAllowed = false

  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_TOP.has(k as never)) continue
    sawAllowed = true

    let newVal: unknown

    if (k === 'name') {
      // not null 컬럼 — 빈 값은 받지 않는다(null 로 떨어뜨리면 DB 제약 위반).
      if (typeof v !== 'string') continue
      const t = v.trim()
      if (t.length === 0) {
        return NextResponse.json({ error: 'name 은 비울 수 없습니다.' }, { status: 400 })
      }
      newVal = t.slice(0, MAX_LEN.name)
    } else if (k === 'status') {
      if (typeof v !== 'string' || !ALLOWED_STATUS.has(v)) continue
      newVal = v
    } else if (k === 'business_hours') {
      newVal = normalizeHours(v)
    } else {
      // nullable 문자열: branch_name / tagline / reason_to_visit / phone / description
      if (v === null) newVal = null
      else if (typeof v === 'string') {
        const t = v.trim()
        newVal = t.length === 0 ? null : t.slice(0, MAX_LEN[k] ?? 500)
      } else continue
    }

    // no-op 은 patch 에도 audit 에도 넣지 않는다.
    const oldVal = (current as Record<string, unknown>)[k]
    if (sameValue(oldVal, newVal)) continue

    patch[k] = newVal
    audit.push({ field: k, old_value: toText(oldVal), new_value: toText(newVal) })
  }

  if (!sawAllowed) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 })
  }

  // name 이 실제로 바뀌면 다국어 표기 초기화(실제 값이 있던 컬럼만 → 변경으로 기록).
  if ('name' in patch) {
    for (const col of NAME_I18N_COLS) {
      const oldT = (current as Record<string, unknown>)[col]
      if (oldT != null) {
        patch[col] = null
        audit.push({ field: col, old_value: toText(oldT), new_value: null })
      }
    }
  }

  // 변경된 게 하나도 없으면(전부 no-op) 성공으로 끝낸다 — 굳이 UPDATE/로그 안 함.
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ data: { id, updated_at: current.updated_at }, changed: [] })
  }

  const { data, error } = await admin
    .from('restaurants')
    .update(patch)
    .eq('id', id)
    .select('id, updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 감사 기록은 best-effort. 본 편집은 이미 반영됐으므로, 로그 실패로 요청 전체를 실패시키지 않고
  // 경고만 함께 반환한다(edited_at 은 DB default now() 사용).
  const logRows = audit.map((a) => ({
    restaurant_id: id,
    field: a.field,
    old_value: a.old_value,
    new_value: a.new_value,
    edited_by: user.email,
  }))
  const { error: auditErr } = await admin.from('restaurant_edit_log').insert(logRows)
  if (auditErr) {
    console.error('[admin edit] audit log insert failed:', auditErr.message)
    return NextResponse.json({
      data,
      changed: audit.map((a) => a.field),
      warning: '편집은 저장됐지만 감사 로그 기록에 실패했습니다.',
    })
  }

  return NextResponse.json({ data, changed: audit.map((a) => a.field) })
}
