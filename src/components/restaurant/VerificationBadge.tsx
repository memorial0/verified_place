import Link from 'next/link'
import { getVerificationMeta, type Verification } from '@/lib/mock/restaurants'

/**
 * 인증 1건을 브랜드 컬러 뱃지로 표시.
 * - 미슐랭/블루리본: 이모지를 rating 수만큼 반복 (예: ⭐⭐ 미슐랭, 🎀🎀🎀 블루리본)
 * - 연예인 픽: 추천 출처를 함께 표기
 * - 클릭하면 /about 의 해당 인증 설명으로 이동, 호버 시 한 줄 설명(title) 노출
 */
export function VerificationBadge({ verification }: { verification: Verification }) {
  const meta = getVerificationMeta(verification.code)
  const emojis = meta.emoji.repeat(Math.max(1, verification.rating ?? 1))
  const suffix = verification.recommender ? ` · ${verification.recommender}` : ''

  return (
    <Link
      href={`/about#${verification.code}`}
      title={meta.shortDesc || meta.label}
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-opacity hover:opacity-75"
      style={{
        color: meta.color,
        borderColor: meta.color,
        backgroundColor: `${meta.color}14`, // 8% 투명도 (hex + alpha)
      }}
    >
      <span aria-hidden>{emojis}</span>
      {meta.label}
      {suffix}
    </Link>
  )
}
