import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

/**
 * Supabase Auth (Magic Link / OAuth) 콜백.
 *   /auth/callback?code=<otp>&next=<원경로>
 * code 를 세션으로 교환한 뒤 next 로 redirect. 실패 시 /admin/login?error=...
 *
 * next 가 외부 URL 일 수 있으니 same-origin 경로로 제한 — 'open redirect' 방어.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? '/admin'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/admin'

  if (!code) {
    return NextResponse.redirect(`${url.origin}/admin/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      `${url.origin}/admin/login?error=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${url.origin}${next}`)
}
