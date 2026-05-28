'use client'

import { useEffect, useState } from 'react'
import { fetchRestaurants, type DataSource } from '@/lib/api/restaurants'
import { type Restaurant } from '@/lib/mock/restaurants'
import { RESTAURANT_DATASET } from '@/lib/data/restaurants'

export type FetchState = DataSource | 'loading'

/**
 * 식당 전체 목록을 한 번 가져오는 데이터 훅.
 * region/verification 필터링은 호출자가 클라이언트에서 적용한다
 * (MapExplorer 의 filterByRegion + verification.some).
 * 로딩 중에는 RESTAURANT_DATASET 으로 채워둔다(no flash).
 */
export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(RESTAURANT_DATASET)
  const [state, setState] = useState<FetchState>('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')

    fetchRestaurants().then(({ restaurants, source }) => {
      if (cancelled) return
      setRestaurants(restaurants)
      setState(source)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return { restaurants, state }
}
