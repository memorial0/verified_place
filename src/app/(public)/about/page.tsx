import Link from 'next/link'
import type { Metadata } from 'next'
import { VERIFICATION_META, VERIFICATION_ORDER } from '@/lib/verifications'

export const metadata: Metadata = {
  title: '소개 · 검증된 맛집',
  description: '검증된 맛집의 서비스 소개와 인증 종류 안내',
}

/**
 * 서비스 소개 페이지 (/about). 정적 서버 컴포넌트.
 * 인증 종류 섹션의 각 카드는 id={code} 앵커 — 배지에서 /about#<code> 로 진입한다.
 */
export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          href="/"
          className="text-xs font-semibold text-gray-400 hover:text-gray-700"
        >
          ← 지도로
        </Link>

        <header className="mt-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              🍽️
            </span>
            <h1 className="text-2xl font-extrabold text-gray-900">검증된 맛집</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            믿을 수 있는 기관·인물이 인증한 식당만 모았습니다
          </p>
        </header>

        <Section title="서비스 소개">
          <p>
            「검증된 맛집」은 믿을 수 있는 기관과 인물이 인증한 식당만 모아 지도에서
            보여주는 서비스입니다. 광고나 자동 수집된 평점이 아니라, 공신력 있는 출처가
            보증한 식당만 담는 것을 원칙으로 합니다.
          </p>
        </Section>

        <Section title="검증 방식">
          <p>
            모든 식당은 미쉐린 가이드·블루리본·정부 지정 제도 등 외부의 공신력 있는 인증을
            근거로 등록됩니다. 평점이나 리뷰를 자동으로 긁어오지 않으며, 각 인증의
            사실(상호·등급·연도)만 확인해 큐레이션합니다. 영업시간·전화번호 같은 기본 정보는
            공식 API와 공개 데이터로 보강합니다.
          </p>
        </Section>

        <Section title="인증 종류">
          <p className="mb-3 text-gray-500">
            식당에 표시되는 배지의 의미입니다. 배지를 누르면 이 페이지의 해당 설명으로
            이동합니다.
          </p>
          <div className="space-y-3">
            {VERIFICATION_ORDER.map((code) => {
              const m = VERIFICATION_META[code]
              return (
                <div
                  key={code}
                  id={code}
                  className="scroll-mt-6 rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                      style={{ backgroundColor: `${m.color}14` }}
                      aria-hidden
                    >
                      {m.emoji}
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold" style={{ color: m.color }}>
                        {m.label}
                      </h3>
                      <p className="text-xs text-gray-400">{m.authority}</p>
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{m.longDesc}</p>
                  {m.sourceUrl && (
                    <a
                      href={m.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold text-gray-400 underline-offset-2 hover:text-gray-900 hover:underline"
                    >
                      공식 출처 ↗
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </Section>

        <Section title="데이터 출처와 한계">
          <p>
            인증 정보는 각 발급 기관의 공개 자료를 기준으로 하며, 지정 현황은 시점에 따라
            달라질 수 있습니다. 영업시간·휴무 등 기본 정보는 변동될 수 있으니 방문 전 확인을
            권장합니다.
          </p>
        </Section>

        <Section title="문의·제보">
          <p>
            잘못된 정보를 발견하셨다면 제보해 주세요. (문의 이메일은 추후 안내 예정입니다.)
          </p>
        </Section>

        <div className="mt-8 border-t border-gray-100 pt-4">
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-900">
            ← 지도로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-extrabold text-gray-900">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}
