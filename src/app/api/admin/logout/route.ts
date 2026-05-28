import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

/**
 * 관리자 로그아웃. POST 만 받음 (CSRF 최소 방어).
 * supabase.auth.signOut() 가 세션 쿠키를 삭제한 뒤 /admin/login 으로 redirect.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/admin/login', req.url), { status: 303 })
}
