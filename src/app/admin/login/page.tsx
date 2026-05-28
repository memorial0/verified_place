'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * 관리자 매직링크 로그인 페이지.
 * Supabase Auth(Email OTP) 로 매직링크를 이메일로 발송한다. 사용자가 메일의
 * 링크를 누르면 /auth/callback?code=... 으로 돌아와 세션 쿠키가 세팅된다.
 *
 * ADMIN_EMAILS 화이트리스트 검사는 middleware/route 핸들러에서 수행 —
 * 이 페이지는 누구나 매직링크 발송을 시도할 수 있다. 하지만 admin 이 아니면
 * 로그인 후 /admin 접근이 차단되므로 결과적으로 무용.
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'sending' || state === 'sent') return
    setState('sending')
    setErrorMsg('')

    const supabase = createClient()
    const next = new URLSearchParams(window.location.search).get('next') ?? '/admin'
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setState('error')
      return
    }
    setState('sent')
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-extrabold text-gray-900">관리자 로그인</h1>
      <p className="mt-1 text-sm text-gray-600">
        매직링크를 이메일로 받습니다. 등록된 관리자만 로그인 후 편집 페이지에 접근할 수 있습니다.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={state === 'sending' || state === 'sent'}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'sending' || state === 'sent'}
          className="rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        >
          {state === 'sending'
            ? '전송 중…'
            : state === 'sent'
              ? '메일 확인하세요'
              : '매직링크 받기'}
        </button>
        {state === 'error' && <p className="text-sm text-red-500">{errorMsg}</p>}
        {state === 'sent' && (
          <p className="text-sm text-emerald-600">
            ✉️ {email} 으로 로그인 링크를 보냈습니다. 메일함을 확인해주세요. 링크는 1시간 동안 유효합니다.
          </p>
        )}
      </form>
    </main>
  )
}
