import Link from 'next/link'
import { getAdminUser } from '@/lib/admin/auth'

/**
 * /admin/* 의 공용 셸. 헤더에 현 admin 이메일 + 로그아웃 버튼 + 메인 이동.
 *
 * 라우트 접근 가드는 middleware 가 담당 — 이 layout 은 헤더 표시용으로만
 * getAdminUser 를 호출한다. layout 이 admin 이외 라우트를 감쌀 일은 없다
 * (Next.js segment 기반 layout 매칭).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm font-extrabold text-gray-900">
            🛠 관리자
          </Link>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700">
            → 메인으로
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {user?.email && <span>{user.email}</span>}
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="text-xs font-semibold text-gray-500 hover:text-red-500"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
