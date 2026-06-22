'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MapExplorer } from '@/components/restaurant/MapExplorer'
import { LanguageGate } from '@/components/LanguageGate'
import { t, LANGUAGE_OPTIONS } from '@/lib/i18n/ui'
import type { Locale } from '@/lib/i18n/display'

const STORAGE_KEY = 'vp_locale'
const VALID: Locale[] = ['en', 'ja', 'zh', 'ko']

/**
 * 클라이언트 앱 셸 — 로케일 상태 + 첫 진입 언어 선택 게이트 + 로컬라이즈된 헤더.
 * 기본 로케일은 English. 선택값은 localStorage(vp_locale)에 영속해 재방문 시 게이트 생략.
 */
export function AppShell() {
  const [locale, setLocale] = useState<Locale>('en')
  const [chosen, setChosen] = useState(false) // 사용자가 언어를 골랐는가(게이트 종료)
  const [ready, setReady] = useState(false) // localStorage 확인 완료(게이트 깜빡임 방지)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (saved && VALID.includes(saved)) {
        setLocale(saved)
        setChosen(true)
      }
    } catch {
      // localStorage 불가 환경 — 기본 en + 게이트 노출로 진행
    }
    setReady(true)
  }, [])

  const choose = (l: Locale) => {
    setLocale(l)
    setChosen(true)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // 영속 실패는 무시 — 이 세션은 정상 동작
    }
  }

  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-gray-50">
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-5 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xl" aria-hidden>
            🥋
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold leading-tight text-gray-900">
              {t(locale, 'appTitle')}
            </h1>
            <p className="truncate text-xs text-gray-400">{t(locale, 'appSubtitle')}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* 언어 전환 — 게이트 이후에도 상단에서 변경 가능 */}
          <div className="flex items-center gap-0.5 rounded-full border border-gray-200 p-0.5">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.locale}
                type="button"
                onClick={() => choose(opt.locale)}
                aria-pressed={locale === opt.locale}
                className={`rounded-full px-2 py-1 text-xs font-bold transition-colors ${
                  locale === opt.locale
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {opt.short}
              </button>
            ))}
          </div>
          <Link
            href="/about"
            className="hidden shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900 sm:inline-block"
          >
            {t(locale, 'about')}
          </Link>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapExplorer locale={locale} />
      </div>

      {ready && !chosen && <LanguageGate onChoose={choose} />}
    </main>
  )
}
