'use client'

import { useEffect, useState } from 'react'

const SCRIPT_ID = 'naver-maps-sdk'

interface Status {
  loaded: boolean
  error: boolean
}

// 모듈 스코프에 1회 로드 Promise를 캐싱 — 여러 컴포넌트가 동시에 마운트돼도 스크립트는 한 번만 주입.
let loadPromise: Promise<void> | null = null

function loadScript(clientId: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if ((window as any).naver?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    const onLoad = () =>
      (window as any).naver?.maps
        ? resolve()
        : reject(new Error('naver.maps 미정의'))
    if (existing) {
      // 이미 로드 완료된 script 태그라면 load 이벤트는 재발화하지 않는다.
      // window.naver.maps 가 이미 존재하면 즉시 resolve — 그렇지 않으면 load 대기.
      if ((window as any).naver?.maps) {
        resolve()
        return
      }
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', () => reject(new Error('스크립트 로드 실패')))
      return
    }
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    // 2025 NCP Maps 마이그레이션: 인증 파라미터가 ncpClientId → ncpKeyId 로 변경됨
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`
    script.onload = onLoad
    script.onerror = () => reject(new Error('스크립트 로드 실패'))
    document.head.appendChild(script)
  })
  return loadPromise
}

/**
 * 네이버 지도 JS SDK 로더.
 * 스크립트 자체는 키가 틀려도 200으로 떨어지고, 인증 실패는 전역 콜백
 * `navermap_authFailure`로 비동기 통지된다 → onerror 외에 이 콜백도 함께 감시한다.
 */
export function useNaverMaps(clientId: string): Status {
  const [status, setStatus] = useState<Status>({ loaded: false, error: false })

  useEffect(() => {
    if (!clientId) {
      setStatus({ loaded: false, error: true })
      return
    }
    let alive = true
    ;(window as any).navermap_authFailure = () => {
      if (alive) setStatus({ loaded: false, error: true })
    }
    loadScript(clientId)
      .then(() => alive && setStatus({ loaded: true, error: false }))
      .catch(() => alive && setStatus({ loaded: false, error: true }))
    return () => {
      alive = false
    }
  }, [clientId])

  return status
}
