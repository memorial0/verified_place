'use client'

import { useEffect, useRef } from 'react'
import {
  Map,
  CustomOverlayMap,
  Polyline,
  useKakaoLoader,
} from 'react-kakao-maps-sdk'
import {
  VERIFICATION_META,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { LatLng } from '@/lib/api/directions'

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
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_MAP_KEY ?? '',
    libraries: ['services'],
  })
  // kakao 전역 타입을 의존하지 않도록 느슨하게 보관 (런타임에 window.kakao 사용)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!selectedId || !mapRef.current) return
    const r = restaurants.find((x) => x.id === selectedId)
    if (!r) return
    const kakao = (window as any).kakao
    if (!kakao) return
    mapRef.current.panTo(new kakao.maps.LatLng(r.lat, r.lng))
  }, [selectedId, restaurants])

  // 경로가 생기면 출발지+도착지가 모두 보이도록 지도 범위 맞춤
  useEffect(() => {
    if (!route || !mapRef.current || route.path.length === 0) return
    const kakao = (window as any).kakao
    if (!kakao) return
    const bounds = new kakao.maps.LatLngBounds()
    bounds.extend(new kakao.maps.LatLng(route.origin.lat, route.origin.lng))
    route.path.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)))
    mapRef.current.setBounds(bounds)
  }, [route])

  const active = restaurants.find((r) => r.id === activeId) ?? null

  if (error) {
    return (
      <Centered>
        지도를 불러오지 못했습니다. NEXT_PUBLIC_MAP_KEY 설정을 확인해 주세요.
      </Centered>
    )
  }
  if (loading) {
    return (
      <Centered>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500" />
      </Centered>
    )
  }

  return (
    <Map
      center={SEOUL_CENTER}
      level={8}
      style={{ width: '100%', height: '100%' }}
      onCreate={(map: any) => {
        mapRef.current = map
      }}
      onClick={() => onSelect(null)}
    >
      {/* 인증 색상별로 차등화된 커스텀 마커 */}
      {restaurants.map((r) => (
        <CustomOverlayMap
          key={r.id}
          position={{ lat: r.lat, lng: r.lng }}
          yAnchor={1}
          zIndex={activeId === r.id ? 40 : 10}
          clickable
        >
          <MarkerPin
            restaurant={r}
            active={activeId === r.id}
            onClick={() => onSelect(r.id)}
          />
        </CustomOverlayMap>
      ))}

      {active && (
        <CustomOverlayMap
          position={{ lat: active.lat, lng: active.lng }}
          yAnchor={1.55}
          zIndex={50}
          clickable
        >
          <PopupCard restaurant={active} onClose={() => onSelect(null)} />
        </CustomOverlayMap>
      )}

      {route && (
        <>
          <Polyline
            path={route.path}
            strokeWeight={5}
            strokeColor="#C4002B"
            strokeOpacity={0.85}
            strokeStyle="solid"
          />
          <CustomOverlayMap position={route.origin} yAnchor={1.4} zIndex={45}>
            <div className="rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white shadow-md">
              출발
            </div>
          </CustomOverlayMap>
        </>
      )}
    </Map>
  )
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
      onClick={onClick}
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 text-sm text-gray-500">
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
    <div className="relative w-60 -translate-y-2 drop-shadow-xl">
      <div className="rounded-2xl border border-gray-100 bg-white p-3.5">
        <button
          type="button"
          onClick={onClose}
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
