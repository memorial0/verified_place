'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'my_course'

/**
 * "내 코스" — 순서를 가진 식당 목록을 localStorage에 영속화하는 훅.
 * 저장(useSavedRestaurants)과 달리 추가 순서가 의미를 가진다(코스 동선).
 * 새로고침 후에도 유지된다. (추후 로그인 시 서버 동기화로 교체 가능)
 */
export function useCourse() {
  const [items, setItems] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw) as string[])
    } catch {
      // 파싱 실패 시 빈 상태 유지
    }
  }, [])

  const persist = (next: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // 저장 실패는 무시 (시크릿 모드 등)
    }
    return next
  }

  /** 코스 끝에 추가 (이미 있으면 무시) */
  const add = useCallback((id: string) => {
    setItems((prev) => (prev.includes(id) ? prev : persist([...prev, id])))
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => persist(prev.filter((x) => x !== id)))
  }, [])

  /** 있으면 제거, 없으면 끝에 추가 */
  const toggle = useCallback((id: string) => {
    setItems((prev) =>
      persist(prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]),
    )
  }, [])

  /** 순서 이동 (재정렬용) */
  const move = useCallback((from: number, to: number) => {
    setItems((prev) => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return persist(next)
    })
  }, [])

  const clear = useCallback(() => setItems(() => persist([])), [])

  const has = useCallback((id: string) => items.includes(id), [items])

  return { items, has, add, remove, toggle, move, clear, count: items.length }
}
