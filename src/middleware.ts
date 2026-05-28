import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * /admin/* 와 /api/admin/* 진입 전에 세션 + admin 이메일 화이트리스트 검사.
 *
 *   1) 매칭 안 되는 경로     → 통과
 *   2) /admin/login          → 통과 (로그인 페이지 자체는 보호 X)
 *   3) 미로그인              → /admin/login 으로 redirect, next= 쿼리에 원경로
 *   4) 로그인됐지만 비-admin → 페이지는 '/' 로 redirect, /api/admin/* 는 403
 *   5) admin 통과            → 세션 쿠키 갱신 후 통과
 *
 * defense in depth — 라우트 핸들러도 같은 헬퍼(getAdminUser)로 재검증한다.
 */

const PROTECTED_PREFIXES = ['/admin', '/api/admin']
const PUBLIC_WITHIN_ADMIN = ['/admin/login']

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function isPublicAdmin(pathname: string): boolean {
  return PUBLIC_WITHIN_ADMIN.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!isProtected(pathname) || isPublicAdmin(pathname)) {
    return NextResponse.next()
  }

  // supabase-ssr 권장 middleware 패턴 — req/res 쿠키를 양방향 동기화해
  // 세션이 자동 갱신될 때 클라이언트 쿠키도 함께 갱신되도록.
  let response = NextResponse.next({ request: { headers: req.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  const isAdmin = !!email && adminEmails().includes(email)

  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (!isAdmin) {
    if (pathname.startsWith('/api/admin')) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
