'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AMENITY_OPTIONS,
  AMENITY_KEYS,
  type AmenityKey,
} from '@/lib/amenities'

interface RestaurantRow {
  id: string
  name: string
  branch_name: string | null
  phone: string | null
  tagline: string | null
  reason_to_visit: string | null
  description: string | null
  business_hours: Record<string, unknown> | null
  amenities: Record<string, unknown> | null
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
  const router = useRouter()
  const initialHours = (restaurant.business_hours ?? {}) as Record<string, unknown>
  const initStr = (k: string) =>
    typeof initialHours[k] === 'string' ? (initialHours[k] as string) : ''

  const [name, setName] = useState(restaurant.name ?? '')
  const [branchName, setBranchName] = useState(restaurant.branch_name ?? '')
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

  // 어메니티 — 6개 키 전부 boolean 으로 관리(누락 키는 false). 저장 시 그대로 전송.
  const initAmenities = (restaurant.amenities ?? {}) as Record<string, unknown>
  const [amenities, setAmenities] = useState<Record<AmenityKey, boolean>>(() =>
    Object.fromEntries(
      AMENITY_KEYS.map((k) => [k, initAmenities[k] === true]),
    ) as Record<AmenityKey, boolean>,
  )

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    kind: 'ok' | 'warn' | 'error'
    msg: string
  } | null>(null)

  // name 검증/경고용 파생값.
  const trimmedName = name.trim()
  const nameEmpty = trimmedName.length === 0
  const nameChanged = trimmedName !== (restaurant.name ?? '')

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
    if (nameEmpty) {
      setFeedback({ kind: 'error', msg: '이름은 비울 수 없습니다.' })
      return
    }
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
      name: trimmedName,
      branch_name: branchName.trim(), // 서버가 빈 문자열 → null 처리
      tagline: tagline.trim(),
      reason_to_visit: reason.trim(),
      phone: phone.trim(),
      description: description.trim(),
      status,
      business_hours: cleanedHours,
      amenities, // 6개 키 boolean 맵 그대로 — 서버가 허용 키/boolean 만 통과
    }

    try {
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        warning?: string
        changed?: string[]
      }
      if (!res.ok) {
        setFeedback({ kind: 'error', msg: json.error ?? `HTTP ${res.status}` })
      } else if (json.warning) {
        // 편집은 저장됐지만 감사 로그 기록 실패 — 콘솔 + 경고 표시.
        console.warn('[admin edit]', json.warning)
        setFeedback({ kind: 'warn', msg: json.warning })
        router.refresh() // 저장은 됐으므로 서버 데이터 갱신(원본 반영 → name 경고 해제)
      } else if (Array.isArray(json.changed) && json.changed.length === 0) {
        // no-op: 바뀐 게 없으니 refresh 안 함.
        setFeedback({ kind: 'ok', msg: '변경 사항 없음' })
      } else {
        setFeedback({ kind: 'ok', msg: '저장됨' })
        router.refresh() // 원본(restaurant.name) 갱신 → 변경 경고 자동 해제
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
        label="식당 이름 (name)"
        hint="검증·표시·외부 지도 링크의 기준이 되는 한국어 상호. 비울 수 없음."
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          placeholder="예: 통나무집닭갈비"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
        {nameEmpty ? (
          <p className="mt-1 text-xs font-semibold text-red-500">이름은 비울 수 없습니다.</p>
        ) : nameChanged ? (
          <p className="mt-1 text-xs font-semibold text-amber-600">
            ⚠️ 이름을 바꾸면 외부 지도 링크가 새 이름 기준으로 바뀝니다.
          </p>
        ) : null}
      </Field>

      <Field label="지점명 (branch_name, 옵션)" hint="예: 본점, 강남점. 없으면 비워 두세요.">
        <input
          type="text"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          maxLength={100}
          placeholder="예: 본점"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </Field>

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

      <Field
        label="외국인 편의 (amenities)"
        hint="외국인 관광객용 어메니티. 체크한 항목만 사용자 카드/상세에 배지로 노출되고, 필터 대상이 됩니다."
      >
        <div className="grid grid-cols-1 gap-1.5 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-2">
          {AMENITY_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={amenities[opt.key]}
                onChange={(e) =>
                  setAmenities((a) => ({ ...a, [opt.key]: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span aria-hidden>{opt.icon}</span>
              <span>{opt.label.en}</span>
              <span className="text-xs text-gray-400">{opt.label.ko}</span>
            </label>
          ))}
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
            className={`text-sm font-semibold ${
              feedback.kind === 'ok'
                ? 'text-emerald-600'
                : feedback.kind === 'warn'
                  ? 'text-amber-600'
                  : 'text-red-500'
            }`}
          >
            {feedback.kind === 'ok' ? '✓ ' : feedback.kind === 'warn' ? '⚠ ' : '✗ '}
            {feedback.msg}
          </span>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={saving || nameEmpty}
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
