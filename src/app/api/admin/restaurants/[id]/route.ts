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
 *   - tagline, reason_to_visit, phone, description: 문자열. trim 후 빈 문자열이면 null.
 *   - status: ALLOWED_STATUS 집합에 포함될 때만 통과.
 *   - business_hours: 객체. 허용 키만, 값은 trim 된 문자열만, 길이 제한 100자.
 */

const ALLOWED_TOP = new Set([
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
  tagline: 500,
  reason_to_visit: 1000,
  phone: 30,
  description: 2000,
}

type Params = Promise<{ id: string }>

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

  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_TOP.has(k as never)) continue

    if (k === 'status') {
      if (typeof v === 'string' && ALLOWED_STATUS.has(v)) patch[k] = v
      continue
    }

    if (k === 'business_hours') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) {
        patch[k] = {}
        continue
      }
      const filtered: Record<string, string> = {}
      for (const [hk, hv] of Object.entries(v as Record<string, unknown>)) {
        if (!ALLOWED_HOURS_KEYS.has(hk)) continue
        if (typeof hv !== 'string') continue
        const trimmed = hv.trim()
        if (trimmed) filtered[hk] = trimmed.slice(0, 100)
      }
      patch[k] = filtered
      continue
    }

    // tagline / reason_to_visit / phone / description: 문자열 → trim, 빈 문자열은 null
    if (v === null) {
      patch[k] = null
      continue
    }
    if (typeof v === 'string') {
      const t = v.trim()
      if (t.length === 0) patch[k] = null
      else patch[k] = t.slice(0, MAX_LEN[k] ?? 500)
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields' }, { status: 400 })
  }

  const admin = createAdminClient()
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
  return NextResponse.json({ data })
}
