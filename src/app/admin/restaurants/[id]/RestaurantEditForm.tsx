'use client'

import { useState } from 'react'

interface RestaurantRow {
  id: string
  name: string
  branch_name: string | null
  phone: string | null
  tagline: string | null
  reason_to_visit: string | null
  description: string | null
  business_hours: Record<string, unknown> | null
  status: string
}

interface Props {
  restaurant: RestaurantRow
}

const DAYS = [
  ['mon', '월'],
  ['tue', '화'],
  ['wed', '수'],
  ['thu', '목'],
  ['fri', '금'],
  ['sat', '토'],
  ['sun', '일'],
] as const

type DayKey = (typeof DAYS)[number][0]

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'published', label: 'published — 사용자에게 노출' },
  { value: 'draft', label: 'draft — 비공개(작업중)' },
  { value: 'archived', label: 'archived — 노출 중단' },
  { value: 'flagged', label: 'flagged — 검토 필요' },
]

/**
 * 식당 편집 폼. 변경 후 PATCH /api/admin/restaurants/:id 호출.
 * business_hours 는 7행 입력 + 메모 + "모두 월요일과 같게" 단축버튼.
 * 빈 영업시간 칸은 저장 시 키 자체에서 제거 → DB JSONB 가 깔끔하게 유지된다.
 */
export function RestaurantEditForm({ restaurant }: Props) {
  const initialHours = (restaurant.business_hours ?? {}) as Record<string, unknown>
  const initStr = (k: string) =>
    typeof initialHours[k] === 'string' ? (initialHours[k] as string) : ''

  const [tagline, setTagline] = useState(restaurant.tagline ?? '')
  const [reason, setReason] = useState(restaurant.reason_to_visit ?? '')
  const [phone, setPhone] = useState(restaurant.phone ?? '')
  const [description, setDescription] = useState(restaurant.description ?? '')
  const [status, setStatus] = useState(restaurant.status)
  const [hours, setHours] = useState<Record<DayKey, string>>({
    mon: initStr('mon'),
    tue: initStr('tue'),
    wed: initStr('wed'),
    thu: initStr('thu'),
    fri: initStr('fri'),
    sat: initStr('sat'),
    sun: initStr('sun'),
  })
  const [hoursNote, setHoursNote] = useState(initStr('note'))

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(
    null,
  )

  function fillAllSameAsMon() {
    setHours((h) => ({
      mon: h.mon,
      tue: h.mon,
      wed: h.mon,
      thu: h.mon,
      fri: h.mon,
      sat: h.mon,
      sun: h.mon,
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setFeedback(null)

    // 빈 값 제거 — DB 가 깔끔하게 유지되고, UI 의 'metadata 있음' 판정도 단순.
    const cleanedHours: Record<string, string> = {}
    for (const [k, v] of Object.entries(hours)) {
      const trimmed = v.trim()
      if (trimmed) cleanedHours[k] = trimmed
    }
    if (hoursNote.trim()) cleanedHours.note = hoursNote.trim()
    if (Object.keys(cleanedHours).length > 0) cleanedHours.source = 'manual'

    const body = {
      tagline: tagline.trim(),
      reason_to_visit: reason.trim(),
      phone: phone.trim(),
      description: description.trim(),
      status,
      business_hours: cleanedHours,
    }

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setFeedback({ kind: 'error', msg: json.error ?? `HTTP ${res.status}` })
      } else {
        setFeedback({ kind: 'ok', msg: '저장됨' })
      }
    } catch (err) {
      setFeedback({ kind: 'error', msg: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <Field
        label="한 줄 설명 (tagline)"
        hint="식당 첫인상을 한 문장으로. 사용자 카드/상세에 그대로 노출됨."
      >
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={200}
          placeholder="예: 40년 한자리, 멸치육수 손칼국수 노포"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </Field>

      <Field
        label="이 곳을 가야 하는 이유 (reason_to_visit)"
        hint="추천 이유, 어떤 메뉴를 시켜야 하는지, 어떤 분위기인지 등을 자유롭게."
      >
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </Field>

      <Field label="전화번호 (phone)">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          placeholder="033-256-3808"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </Field>

      <Field
        label="영업시간 (business_hours)"
        hint="요일별 자유 입력 — 예: '11:00-22:00', '휴무', '11:00-15:00, 17:00-22:00'."
      >
        <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-3">
          {DAYS.map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <label className="w-7 shrink-0 text-xs font-bold text-gray-600">
                {label}
              </label>
              <input
                type="text"
                value={hours[key]}
                onChange={(e) => setHours((h) => ({ ...h, [key]: e.target.value }))}
                maxLength={100}
                placeholder="11:00-22:00 또는 휴무"
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={fillAllSameAsMon}
            className="mt-1 text-xs font-semibold text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            모두 월요일과 같게
          </button>
          <input
            type="text"
            value={hoursNote}
            onChange={(e) => setHoursNote(e.target.value)}
            maxLength={100}
            placeholder="메모 (예: 라스트오더 30분 전)"
            className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>
      </Field>

      <Field label="긴 설명 (description, 옵션)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </Field>

      <Field label="공개 상태">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex items-center justify-between gap-3 pt-2">
        {feedback ? (
          <span
            className={`text-sm font-semibold ${feedback.kind === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}
          >
            {feedback.kind === 'ok' ? '✓ ' : '✗ '}
            {feedback.msg}
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-60"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}
