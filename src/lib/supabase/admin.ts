import { createClient } from '@supabase/supabase-js'

/**
 * 서버 전용 관리자 클라이언트 (service_role).
 *
 * ⚠️ service_role 키는 RLS를 우회한다. 절대 클라이언트 번들에 노출 금지.
 *    공공 API 수집 / 크롤링 데이터 대량 적재(upsert) / 검수 작업에만 사용.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
