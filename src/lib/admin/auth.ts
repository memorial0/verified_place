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
 * 현재 세션의 admin 사용자 반환. 미로그인/비-admin 이면 null.
 * 서버 컴포넌트와 route handler 양쪽에서 사용.
 *
 * middleware 가 /admin/* 와 /api/admin/* 진입 전에 이미 검사하지만, 다중 방어를
 * 위해 라우트 핸들러도 이 함수로 한 번 더 확인한다.
 */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user || !data.user.email) return null
  if (!isAdminEmail(data.user.email)) return null
  return { id: data.user.id, email: data.user.email }
}
