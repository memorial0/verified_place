import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

type SearchParams = Promise<{ q?: string }>

/**
 * 식당 검색·리스트. 이름 ILIKE 매칭 + 최근 수정순 30건.
 *
 * service_role 클라이언트로 RLS 우회 — draft/archived 상태도 표시된다
 * (admin 이 어떤 상태든 편집해야 하므로).
 */
export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { q } = await searchParams
  const query = (q ?? '').trim()
  const admin = createAdminClient()

  let select = admin
    .from('restaurants')
    .select('id, name, branch_name, sigungu, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(30)
  if (query) select = select.ilike('name', `%${query}%`)

  const { data, error } = await select

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-extrabold text-gray-900">식당 검색</h1>
      <p className="mt-1 text-sm text-gray-500">
        편집할 식당을 이름으로 검색하거나, 최근 수정순 목록에서 고르세요.
      </p>

      <form className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="식당 이름…"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white"
        >
          검색
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          DB 오류: {error.message}
        </p>
      )}

      <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {(data ?? []).map((r) => (
          <li key={r.id}>
            <Link
              href={`/admin/restaurants/${r.id}`}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-gray-50"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-gray-900">
                  {r.name}
                  {r.branch_name ? ` · ${r.branch_name}` : ''}
                </span>
                <span className="truncate text-xs text-gray-400">
                  {r.sigungu ?? '-'} · {r.status} · 수정{' '}
                  {new Date(r.updated_at).toLocaleDateString('ko-KR')}
                </span>
              </span>
              <span className="text-xs text-gray-300">→</span>
            </Link>
          </li>
        ))}
        {(data ?? []).length === 0 && !error && (
          <li className="px-3 py-8 text-center text-sm text-gray-400">
            {query ? `"${query}" 결과 없음` : '식당 없음'}
          </li>
        )}
      </ul>
    </div>
  )
}
