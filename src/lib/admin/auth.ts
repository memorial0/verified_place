import { createClient } from '@/lib/supabase/server'

/**
 * .env 의 ADMIN_EMAILS (콤마 구분) → 정규화된 소문자 배열.
 *   예: ADMIN_EMAILS="neukkimdaero@gmail.com, hello@example.com"
 *
 * 화이트리스트 비어 있으면(미설정) 어떤 사용자도 admin 으로 인정되지 않는다 —
 * fail-closed 정책.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().includes(email.trim().toLowerCase())
}

/**
 * 개발환경 임시 우회 여부. ADMIN_DEV_BYPASS=true 이고 NODE_ENV 가 production 이
 * 아닐 때만 true. 프로덕션에선 플래그 무시 — fail-safe. middleware 의 동일 조건과 1:1.
 */
export function isAdminDevBypass(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.ADMIN_DEV_BYPASS === 'true'
  )
}

/**
 * 현재 세션의 admin 사용자 반환. 미로그인/비-admin 이면 null.
 * 서버 컴포넌트와 route handler 양쪽에서 사용.
 *
 * middleware 가 /admin/* 와 /api/admin/* 진입 전에 이미 검사하지만, 다중 방어를
 * 위해 라우트 핸들러도 이 함수로 한 번 더 확인한다.
 */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  // 개발 우회: 합성 admin 사용자 반환 → layout 헤더/편집 라우트가 로그인 없이 동작.
  if (isAdminDevBypass()) {
    return { id: 'dev-bypass', email: adminEmails()[0] ?? 'dev@localhost' }
  }
  const supabase = await createClient()
  // 세션 미존재는 정상(null), 그 외 예외도 미인증으로 수렴시켜 호출부가 깨지지 않게.
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user || !data.user.email) return null
    if (!isAdminEmail(data.user.email)) return null
    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
}
