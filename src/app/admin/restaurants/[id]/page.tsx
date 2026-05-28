import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { RestaurantEditForm } from './RestaurantEditForm'

export const runtime = 'edge'

type Params = Promise<{ id: string }>

/**
 * 식당 편집 페이지. 서버 컴포넌트로 식당 1건 조회 후, 클라이언트 폼에 넘겨준다.
 * service_role 로 조회 → draft/archived 도 편집 가능.
 */
export default async function AdminEditPage({ params }: { params: Params }) {
  const { id } = await params
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('restaurants')
    .select(
      'id, name, branch_name, phone, tagline, reason_to_visit, description, business_hours, status',
    )
    .eq('id', id)
    .maybeSingle()
  if (error || !data) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-700">
        ← 검색으로
      </Link>
      <h1 className="mt-2 text-xl font-extrabold text-gray-900">
        {data.name}
        {data.branch_name ? ` · ${data.branch_name}` : ''}
      </h1>
      <RestaurantEditForm
        restaurant={{
          id: data.id,
          name: data.name,
          branch_name: data.branch_name,
          phone: data.phone,
          tagline: data.tagline,
          reason_to_visit: data.reason_to_visit,
          description: data.description,
          business_hours: data.business_hours,
          status: data.status,
        }}
      />
    </div>
  )
}
