import Link from 'next/link'
import { MapExplorer } from '@/components/restaurant/MapExplorer'

export default function HomePage() {
  return (
    <main className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden>
            🍽️
          </span>
          <div>
            <h1 className="text-base font-extrabold leading-tight text-gray-900">
              검증된 맛집
            </h1>
            <p className="text-xs text-gray-400">
              믿을 수 있는 기관·인물이 인증한 식당만 모았습니다
            </p>
          </div>
        </div>
        <Link
          href="/about"
          className="shrink-0 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900"
        >
          소개
        </Link>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapExplorer />
      </div>
    </main>
  )
}
