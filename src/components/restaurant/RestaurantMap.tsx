'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  VERIFICATION_META,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { LatLng } from '@/lib/api/directions'
import { useNaverMaps } from '@/lib/hooks/useNaverMaps'
import { getReactOverlayClass } from '@/lib/naver/overlay'

const SEOUL_CENTER = { lat: 37.5547, lng: 126.9897 }

interface Props {
  restaurants: Restaurant[]
  /** 오버레이를 띄울 식당(hover 또는 클릭) */
  activeId: string | null
  /** 클릭으로 고정 선택된 식당 → 지도 panTo 트리거 */
  selectedId: string | null
  /** 길찾기 경로 (출발지 + 경로 좌표). 있으면 폴리라인 표시 */
  route: { origin: LatLng; path: LatLng[] } | null
  onSelect: (id: string | null) => void
}

export function RestaurantMap({
  restaurants,
  activeId,
  selectedId,
  route,
  onSelect,
}: Props) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ?? ''
  const { loaded, error } = useNaverMaps(clientId)
  // naver 전역 타입에 의존하지 않도록 느슨하게 보관 (런타임에 window.naver 사용)
  const naver = typeof window !== 'undefined' ? (window as any).naver : undefined

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylineRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  // 빈 지도 클릭 시 선택 해제 — 리스너 안에서 항상 최신 onSelect 를 쓰도록 ref 경유
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // SDK 로드 완료 후 지도 1회 생성
  useEffect(() => {
    if (!loaded || !naver || !containerRef.current || mapRef.current) return
    mapRef.current = new naver.maps.Map(containerRef.current, {
      center: new naver.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
      zoom: 11,
    })
    naver.maps.Event.addListener(mapRef.current, 'click', () =>
      onSelectRef.current(null),
    )
    setMapReady(true)
  }, [loaded, naver])

  // 선택 식당으로 부드럽게 이동
  useEffect(() => {
    if (!selectedId || !mapRef.current || !naver) return
    const r = restaurants.find((x) => x.id === selectedId)
    if (!r) return
    mapRef.current.panTo(new naver.maps.LatLng(r.lat, r.lng))
  }, [selectedId, restaurants, naver])

  // 경로가 생기면 출발지+도착지가 모두 보이도록 지도 범위 맞춤
  useEffect(() => {
    if (!route || !mapRef.current || !naver || route.path.length === 0) return
    const start = new naver.maps.LatLng(route.origin.lat, route.origin.lng)
    const bounds = new naver.maps.LatLngBounds(start, start)
    route.path.forEach((p) => bounds.extend(new naver.maps.LatLng(p.lat, p.lng)))
    mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
  }, [route, naver])

  // 경로 폴리라인 (route 변할 때마다 교체)
  useEffect(() => {
    if (!mapRef.current || !naver) return
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
    if (!route || route.path.length === 0) return
    polylineRef.current = new naver.maps.Polyline({
      map: mapRef.current,
      path: route.path.map((p) => new naver.maps.LatLng(p.lat, p.lng)),
      strokeColor: '#C4002B',
      strokeWeight: 5,
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    })
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
        polylineRef.current = null
      }
    }
  }, [route, naver])

  const active = restaurants.find((r) => r.id === activeId) ?? null

  if (error) {
    return <MapLoadError clientId={clientId} />
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {!mapReady && (
        <Centered>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
        </Centered>
      )}

      {mapReady && naver && (
        <>
          {/* 인증 색상별로 차등화된 커스텀 마커 */}
          {restaurants.map((r) => (
            <MapOverlay
              key={r.id}
              map={mapRef.current}
              naver={naver}
              position={{ lat: r.lat, lng: r.lng }}
              yAnchor={1}
              zIndex={activeId === r.id ? 40 : 10}
            >
              <MarkerPin
                restaurant={r}
                active={activeId === r.id}
                onClick={() => onSelect(r.id)}
              />
            </MapOverlay>
          ))}

          {active && (
            <MapOverlay
              map={mapRef.current}
              naver={naver}
              position={{ lat: active.lat, lng: active.lng }}
              yAnchor={1.55}
              zIndex={50}
            >
              <PopupCard restaurant={active} onClose={() => onSelect(null)} />
            </MapOverlay>
          )}

          {route && (
            <MapOverlay
              map={mapRef.current}
              naver={naver}
              position={route.origin}
              yAnchor={1.4}
              zIndex={45}
            >
              <div className="rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white shadow-md">
                출발
              </div>
            </MapOverlay>
          )}
        </>
      )}
    </div>
  )
}

/**
 * 네이버 지도 위에 React children 을 띄우는 오버레이.
 * 분리된 DOM 노드를 OverlayView 가 좌표에 맞춰 배치하고, 그 안으로 children 을 포털링한다.
 */
function MapOverlay({
  map,
  naver,
  position,
  xAnchor = 0.5,
  yAnchor = 1,
  zIndex,
  children,
}: {
  map: any
  naver: any
  position: LatLng
  xAnchor?: number
  yAnchor?: number
  zIndex?: number
  children: React.ReactNode
}) {
  const elRef = useRef<HTMLDivElement | null>(null)
  if (elRef.current === null) elRef.current = document.createElement('div')
  const overlayRef = useRef<any>(null)

  useEffect(() => {
    const Overlay = getReactOverlayClass(naver)
    const overlay = new Overlay({
      position: new naver.maps.LatLng(position.lat, position.lng),
      element: elRef.current!,
      xAnchor,
      yAnchor,
      zIndex,
    })
    overlay.setMap(map)
    overlayRef.current = overlay
    return () => {
      overlay.setMap(null)
      overlayRef.current = null
    }
    // 위치는 아래 effect 에서 갱신 — 생성은 map/naver 기준 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, naver])

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setPosition(new naver.maps.LatLng(position.lat, position.lng))
    }
  }, [naver, position.lat, position.lng])

  return createPortal(children, elRef.current)
}

/** 대표 인증 색상으로 칠해진 핀. active일 때 확대 + 흰 링 강조. */
function MarkerPin({
  restaurant,
  active,
  onClick,
}: {
  restaurant: Restaurant
  active: boolean
  onClick: () => void
}) {
  const primary = primaryVerification(restaurant)
  const color = primary ? VERIFICATION_META[primary.code].color : '#111827'
  const emoji = primary ? VERIFICATION_META[primary.code].emoji : '📍'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={restaurant.name}
      className="flex flex-col items-center"
    >
      <span
        className={`flex items-center justify-center rounded-full text-sm shadow-md ring-2 ring-white transition-transform ${
          active ? 'h-10 w-10 scale-105' : 'h-8 w-8'
        }`}
        style={{ backgroundColor: color }}
      >
        {emoji}
      </span>
      <span
        className="-mt-1 h-3 w-3 rotate-45 rounded-sm ring-2 ring-white"
        style={{ backgroundColor: color }}
      />
    </button>
  )
}

/**
 * 지도 로드 실패 안내.
 * 네이버 지도 JS SDK 는 키/도메인이 틀려도 스크립트는 200으로 로드되고, 인증은
 * 전역 콜백 navermap_authFailure 로 비동기 실패 통지된다. 흔한 원인 둘:
 *  1) 키 미주입 — NEXT_PUBLIC_*는 빌드타임 inline이라 빌드 시 값이 없으면 빈 문자열이 박힌다.
 *  2) 도메인 미등록 — NCP Maps 애플리케이션의 Web 서비스 URL 에 현재 도메인이 없으면 인증 거부.
 * 키 유무로 둘을 구분해, 등록해야 할 현재 도메인까지 함께 보여준다.
 */
function MapLoadError({ clientId }: { clientId: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <Centered>
      <div className="max-w-sm space-y-2 px-6 text-center">
        <p className="text-base font-bold text-gray-700">지도를 불러오지 못했습니다</p>
        {clientId ? (
          <>
            <p>
              네이버 지도 인증이 거부됐습니다. NAVER Cloud Platform → Maps 애플리케이션
              → <b>Web 서비스 URL</b>에 아래 주소를 등록해 주세요.
            </p>
            {origin && (
              <code className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                {origin}
              </code>
            )}
          </>
        ) : (
          <p>
            네이버 지도 Client ID(
            <code className="font-bold">NEXT_PUBLIC_NAVER_CLIENT_ID</code>)가 비어
            있습니다. <b>빌드 시점</b>에 환경변수가 주입됐는지 확인해 주세요.
          </p>
        )}
      </div>
    </Centered>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">
      {children}
    </div>
  )
}

/** 보조 요소로서의 지도 팝업 — 이름/키워드/한 줄 설명만 간결하게. 상세는 사이드바 카드. */
function PopupCard({
  restaurant,
  onClose,
}: {
  restaurant: Restaurant
  onClose: () => void
}) {
  const primary = primaryVerification(restaurant)
  const accent = primary ? VERIFICATION_META[primary.code].color : '#111827'

  return (
    <div
      className="relative w-60 -translate-y-2 drop-shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          aria-label="닫기"
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>

        <h3 className="pr-6 text-base font-bold text-gray-900">{restaurant.name}</h3>
        {restaurant.keywords.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {restaurant.keywords.slice(0, 3).map((k) => (
              <span
                key={k}
                className="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ color: accent, backgroundColor: `${accent}14` }}
              >
                #{k}
              </span>
            ))}
          </div>
        )}
        {restaurant.tagline && (
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
            {restaurant.tagline}
          </p>
        )}
      </div>
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-100 bg-white" />
    </div>
  )
}
