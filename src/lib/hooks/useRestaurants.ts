'use client'

import { useEffect, useState } from 'react'
import { fetchRestaurants, type DataSource } from '@/lib/api/restaurants'
import { type FilterValue, type Restaurant } from '@/lib/mock/restaurants'
import { RESTAURANT_DATASET } from '@/lib/data/restaurants'

export type FetchState = DataSource | 'loading'

/**
 * 필터 값에 따라 식당 목록을 가져오는 데이터 훅.
 * react-query를 쓰지 않고 useEffect로 구성했으며, 교체 시에도 인터페이스는 동일하게 유지된다.
 * 로딩 중에는 직전 데이터를 유지(no flash)하고, 실패 시 fetchRestaurants가 Mock으로 폴백한다.
 */
export function useRestaurants(filter: FilterValue) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() =>
    filter === 'all'
      ? RESTAURANT_DATASET
      : RESTAURANT_DATASET.filter((r) =>
          r.verifications.some((v) => v.code === filter),
        ),
  )
  const [state, setState] = useState<FetchState>('loading')

  useEffect(() => {
    let cancelled = false
    setState('loading')

    fetchRestaurants(filter).then(({ restaurants, source }) => {
      if (cancelled) return
      setRestaurants(restaurants)
      setState(source)
    })

    return () => {
      cancelled = true
    }
  }, [filter])

  return { restaurants, state }
}
