'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'saved_restaurants'

/**
 * 식당 저장(북마크) 상태를 localStorage에 영속화하는 훅.
 * 새로고침 후에도 저장 목록이 유지된다. (추후 로그인 시 서버 동기화로 교체 가능)
 */
export function useSavedRestaurants() {
  const [saved, setSaved] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSaved(new Set(JSON.parse(raw) as string[]))
    } catch {
      // 파싱 실패 시 빈 상태 유지
    }
  }, [])

  const toggle = useCallback((id: string) => {
    setSaved((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // 저장 실패는 무시 (시크릿 모드 등)
      }
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => saved.has(id), [saved])

  return { isSaved, toggle, savedCount: saved.size }
}
