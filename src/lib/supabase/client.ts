import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트.
 * anon 키만 사용하며 RLS 정책의 적용을 받는다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
