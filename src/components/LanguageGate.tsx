'use client'

import { t, LANGUAGE_OPTIONS } from '@/lib/i18n/ui'
import type { Locale } from '@/lib/i18n/display'

interface Props {
  onChoose: (locale: Locale) => void
}

/**
 * 첫 진입 시 언어 선택 화면 (외국인 방문객용).
 * 4개 언어 카드 — 각 카드에 그 언어의 환영 문구를 함께 보여, 한 번 탭하면
 * 해당 언어로 앱에 진입한다. 선택값은 상위(AppShell)에서 localStorage 에 영속.
 */
export function LanguageGate({ onChoose }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-1 text-center text-3xl" aria-hidden>
          🥋🍽️
        </div>
        <h1 className="text-center text-lg font-extrabold text-gray-900">
          {t('en', 'appTitle')}
        </h1>
        <p className="mt-1 text-center text-xs text-gray-400">
          {t('en', 'chooseLanguage')} · 言語 · 语言 · 언어
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.locale}
              type="button"
              onClick={() => onChoose(opt.locale)}
              className="group flex flex-col items-start gap-1 rounded-2xl border border-gray-200 p-4 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50"
            >
              <span className="text-base font-extrabold text-gray-900 group-hover:text-emerald-700">
                {opt.name}
              </span>
              <span className="text-xs leading-snug text-gray-500">
                {t(opt.locale, 'welcomeTagline')}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
