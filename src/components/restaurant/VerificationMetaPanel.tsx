import {
  getVerificationMeta,
  type Verification,
  type VerificationCode,
} from '@/lib/mock/restaurants'

interface Props {
  verifications: Verification[]
}

/**
 * 한 식당의 인증 리스트를 받아, metadata 가 있는 인증들에 대해 코드별로
 * 풍부한 정보를 카드로 노출한다. metadata 가 비어 있는 인증(michelin/blue_ribbon
 * 처럼 등급만 있는 것)은 자동으로 빠진다 — 해당 인증은 뱃지만으로 충분.
 *
 * 한 식당이 인증을 여러 개 가지면 각각의 metadata 박스를 다 보여준다.
 * (예: centennial + exemplary 동시 보유 → 백년가게 이야기 + 모범음식점 정보)
 */
export function VerificationMetaPanel({ verifications }: Props) {
  const items = verifications
    .map((v) => ({ v, content: renderMeta(v) }))
    .filter((x): x is { v: Verification; content: JSX.Element } => x.content !== null)

  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map(({ v, content }, i) => {
        const meta = getVerificationMeta(v.code)
        return (
          <section
            key={`${v.code}-${i}`}
            className="rounded-xl border bg-white p-3"
            style={{ borderColor: `${meta.color}33` }}
          >
            <h4
              className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ color: meta.color }}
            >
              <span aria-hidden>{meta.emoji}</span>
              <span>{labelOf(v.code, meta.label)}</span>
            </h4>
            {content}
          </section>
        )
      })}
    </div>
  )
}

/** 섹션 헤더 라벨 — meta.label('백년가게') 보다 더 맥락 있는 문구 사용. */
function labelOf(code: VerificationCode, fallback: string): string {
  if (code === 'centennial') return '백년가게 이야기'
  if (code === 'good_price') return '착한가격 대표메뉴'
  if (code === 'exemplary') return '모범음식점 정보'
  return fallback
}

/** 인증 코드별 metadata → JSX. metadata 가 없거나 알 수 없으면 null 반환. */
function renderMeta(v: Verification): JSX.Element | null {
  if (!v.metadata) return null

  if (v.code === 'centennial') {
    const desc = strField(v.metadata, 'desc')
    if (!desc) return null
    return <p className="text-sm leading-relaxed text-gray-700">{desc}</p>
  }

  if (v.code === 'good_price') {
    const menu = strField(v.metadata, 'menu')
    if (!menu) return null
    return (
      <p className="text-sm font-semibold text-gray-800">
        <span className="text-gray-500">대표메뉴 — </span>
        {menu}
      </p>
    )
  }

  if (v.code === 'exemplary') {
    const menu = strField(v.metadata, 'primary_menu')
    const seating = strField(v.metadata, 'seating')
    const wheelchair = boolField(v.metadata, 'wheelchair_accessible')
    if (!menu && !seating && wheelchair == null) return null
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-gray-700">
        {menu && (
          <>
            <dt className="text-gray-500">대표메뉴</dt>
            <dd className="font-semibold text-gray-800">{menu}</dd>
          </>
        )}
        {seating && (
          <>
            <dt className="text-gray-500">좌석</dt>
            <dd>{seatingLabel(seating)}</dd>
          </>
        )}
        {wheelchair === true && (
          <>
            <dt className="text-gray-500">접근성</dt>
            <dd>♿ 휠체어 접근 가능</dd>
          </>
        )}
        {/* wheelchair_accessible === false 는 의도적으로 노출 생략 — 차별적 인상을 피하기 위함. */}
      </dl>
    )
  }

  // michelin / blue_ribbon / celebrity 등 — metadata 패널 없음.
  return null
}

function strField(m: Record<string, unknown>, key: string): string | null {
  const v = m[key]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null
}

function boolField(m: Record<string, unknown>, key: string): boolean | null {
  const v = m[key]
  return typeof v === 'boolean' ? v : null
}

function seatingLabel(raw: string): string {
  if (raw === '둘다') return '입식·좌식 모두 가능'
  return raw // '입식' / '좌식' — 한국어 원본 그대로
}
