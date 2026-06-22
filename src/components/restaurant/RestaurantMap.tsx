'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  getVerificationMeta,
  primaryVerification,
  type Restaurant,
} from '@/lib/mock/restaurants'
import type { LatLng } from '@/lib/api/directions'
import { haversineMeters } from '@/lib/course/order'
import { displayName, type Locale } from '@/lib/i18n/display'
import { t } from '@/lib/i18n/ui'
import { categoryLabel } from '@/lib/categories'
import { REGION_CENTERS, CHUNCHEON_VENUE_CENTER, type Region } from '@/lib/region/region'
import { useNaverMaps } from '@/lib/hooks/useNaverMaps'
import { getReactOverlayClass } from '@/lib/naver/overlay'

// 대회 방문객 거점 — 춘천 송암스포츠타운(대회장) 중심. region.ts 단일 출처 재사용.
const DEFAULT_CENTER = CHUNCHEON_VENUE_CENTER
// 대회장 중심 + 시내 주요 식당도 보이는 적당한 범위
const DEFAULT_ZOOM = 13

interface Props {
  restaurants: Restaurant[]
  /** 표시 로케일 — 마커 aria-label, 팝업 제목에 displayName 으로 적용 */
  locale: Locale
  /** 지역 — 변경 시 해당 거점 좌표로 panTo. 'all' 은 이동하지 않음 */
  region: Region
  /** 오버레이/강조 대상 (hover ?? preview ?? selected) */
  activeId: string | null
  /** panTo 대상 (preview ?? selected) */
  selectedId: string | null
  /** 미니시트로 미리보기 중인 식당 — hover 팝업 중복 방지 */
  previewId: string | null
  /** 길찾기 경로 (출발지 + 경로 좌표). 있으면 폴리라인 표시 */
  route: { origin: LatLng; path: LatLng[] } | null
  /** 코스에 담긴 식당 (담은/정렬된 순서). 핀에 번호·출발/도착 표시 */
  courseStops: Restaurant[]
  /** 출발점이 '내 위치'인지 — true면 출발은 코스 항목이 아니라 현재 위치 */
  startFromMe: boolean
  /** 코스 전체 경로(폴리라인)가 표시 중인지 — 포커스 모드/화살표 활성 */
  courseRouteActive: boolean
  /** 마커 클릭 → 미니시트 미리보기 */
  onPreview: (id: string | null) => void
  /** 코스 핀 hover → 활성 정류지 공유 (목록↔지도 상호 강조). null=해제 */
  onHover: (id: string | null) => void
  /** 빈 지도 클릭/팝업 닫기 → 선택 해제 */
  onClear: () => void
}

export function RestaurantMap({
  restaurants,
  locale,
  region,
  activeId,
  selectedId,
  previewId,
  route,
  courseStops,
  startFromMe,
  courseRouteActive,
  onPreview,
  onHover,
  onClear,
}: Props) {
  const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID ?? ''
  const { loaded, error } = useNaverMaps(clientId)
  // naver 전역 타입에 의존하지 않도록 느슨하게 보관 (런타임에 window.naver 사용).
  // ⚠️ 인증 부분실패(401) 시 window.naver 는 존재하나 naver.maps 가 비어 있을 수 있다.
  //    그 경우 naver.maps.LatLng 등에서 전체 화면 크래시 → naver.maps 가 준비됐을
  //    때만 truthy 로 노출해, 아래 모든 가드(!naver)와 자식 전달이 한 번에 안전해진다.
  const naverGlobal = typeof window !== 'undefined' ? (window as any).naver : undefined
  const naver = naverGlobal?.maps ? naverGlobal : undefined

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polylinesRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  // 포커스 모드 임시 해제 — '전체 보기' 토글로 흐림을 잠깐 풀 수 있다
  const [showAll, setShowAll] = useState(false)

  // 빈 지도 클릭 시 선택 해제 — 리스너 안에서 항상 최신 onClear 를 쓰도록 ref 경유
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  // SDK 로드 완료 후 지도 1회 생성
  useEffect(() => {
    if (!loaded || !naver || !containerRef.current || mapRef.current) return
    try {
      mapRef.current = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        zoom: DEFAULT_ZOOM,
      })
      naver.maps.Event.addListener(mapRef.current, 'click', () =>
        onClearRef.current(),
      )
      setMapReady(true)
    } catch (e) {
      // 네이버 SDK 인증 실패(도메인 미등록 등) 시 내부 상태가 깨져 동기 throw 될 수 있다.
      // 전역 콜백 navermap_authFailure → error 가 곧 set 되어 MapLoadError 로 폴백되므로,
      // 여기서는 화면 전체 크래시만 막는다.
      mapRef.current = null
      console.warn('[map] 지도 초기화 실패 — 네이버 키/도메인 등록 확인:', (e as Error).message)
    }
  }, [loaded, naver])

  // 선택 식당으로 부드럽게 이동
  useEffect(() => {
    if (!selectedId || !mapRef.current || !naver) return
    const r = restaurants.find((x) => x.id === selectedId)
    if (!r) return
    mapRef.current.panTo(new naver.maps.LatLng(r.lat, r.lng))
  }, [selectedId, restaurants, naver])

  // 지역 변경 시 해당 거점 좌표로 panTo. 'all' 은 사용자 시야 유지.
  // 첫 마운트에서 region='chuncheon'이면 DEFAULT_CENTER 와 동일 좌표라 시각 변화 0.
  useEffect(() => {
    if (region === 'all' || !mapRef.current || !naver) return
    const center = REGION_CENTERS[region]
    mapRef.current.panTo(new naver.maps.LatLng(center.lat, center.lng))
  }, [region, naver])

  // 경로가 생기면 출발지+도착지가 모두 보이도록 지도 범위 맞춤
  useEffect(() => {
    if (!route || !mapRef.current || !naver || route.path.length === 0) return
    const start = new naver.maps.LatLng(route.origin.lat, route.origin.lng)
    const bounds = new naver.maps.LatLngBounds(start, start)
    route.path.forEach((p) => bounds.extend(new naver.maps.LatLng(p.lat, p.lng)))
    mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
  }, [route, naver])

  // 경로 폴리라인 (route 변할 때마다 교체).
  // 가독성: 어두운 외곽선(굵게) 위에 밝은 안쪽선(얇게)을 겹치는 casing 처리 +
  // zIndex 를 높여 다른 오버레이/도로 위로 또렷하게 띄운다.
  useEffect(() => {
    if (!mapRef.current || !naver) return
    const clear = () => {
      polylinesRef.current.forEach((pl) => pl.setMap(null))
      polylinesRef.current = []
    }
    clear()
    if (!route || route.path.length === 0) return
    const path = route.path.map((p) => new naver.maps.LatLng(p.lat, p.lng))
    const common = {
      map: mapRef.current,
      path,
      strokeStyle: 'solid' as const,
      strokeLineCap: 'round' as const,
      strokeLineJoin: 'round' as const,
    }
    const casing = new naver.maps.Polyline({
      ...common,
      strokeColor: '#5B0016', // 어두운 외곽
      strokeWeight: 9,
      strokeOpacity: 0.9,
      zIndex: 100,
    })
    const inner = new naver.maps.Polyline({
      ...common,
      strokeColor: '#FF274B', // 밝은 안쪽
      strokeWeight: 5,
      strokeOpacity: 1,
      zIndex: 101,
    })
    polylinesRef.current = [casing, inner]
    return clear
  }, [route, naver])

  const active = restaurants.find((r) => r.id === activeId) ?? null

  // 코스 순서 번호 — 사이드바와 동일한 배열 순서라 항상 1:1 동기화된다.
  const courseSeq = new Map(courseStops.map((s, i) => [s.id, i + 1]))
  const courseN = courseStops.length
  // '코스만 보기'(경로 표시 중 기본) — 코스 밖 마커는 아예 숨긴다. showAll 토글로 전체 표시.
  const courseOnly = courseRouteActive && !showAll
  // 진행 방향 화살표 지점 (경로 path 를 일정 간격으로 샘플링)
  const arrows = route ? arrowPoints(route.path) : []
  // '출발' 배지: 코스 첫 집 출발이면 1번 코스 핀이 출발 역할 → 중복 배지는 숨긴다.
  const showOriginBadge = !!route && !(courseRouteActive && !startFromMe)

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

      {/* 포커스 모드 토글 — 경로 표시 중 코스 밖 마커를 보였다/숨겼다 */}
      {mapReady && courseRouteActive && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="absolute right-3 top-3 z-10 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-700 shadow-md backdrop-blur transition-colors hover:bg-white"
        >
          {showAll ? `🎯 ${t(locale, 'focusCourse')}` : `👁 ${t(locale, 'showAllMarkers')}`}
        </button>
      )}

      {mapReady && naver && (
        <>
          {/* 일반 마커 — 코스 항목은 아래 코스 핀으로 따로 그린다.
              '코스만 보기'에선 코스 밖 마커를 렌더하지 않는다(완전 숨김). */}
          {!courseOnly &&
            restaurants
              .filter((r) => !courseSeq.has(r.id))
              .map((r) => (
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
                    locale={locale}
                    active={activeId === r.id}
                    onClick={() => onPreview(r.id)}
                  />
                </MapOverlay>
              ))}

          {/* 진행 방향 화살표 (셰브론) — 폴리라인 위, 코스 핀 아래 */}
          {arrows.map((a, i) => (
            <MapOverlay
              key={`arrow-${i}`}
              map={mapRef.current}
              naver={naver}
              position={{ lat: a.lat, lng: a.lng }}
              xAnchor={0.5}
              yAnchor={0.5}
              zIndex={30}
            >
              <ArrowChevron bearing={a.bearing} />
            </MapOverlay>
          ))}

          {/* 코스 핀 — 경로(폴리라인)와 무관하게 courseStops 만으로 렌더한다.
              경로 실패로 route=null 이 돼도 번호·출발/도착 핀은 그대로 남는다. */}
          {courseStops.map((s, i) => (
            <MapOverlay
              key={`course-${s.id}`}
              map={mapRef.current}
              naver={naver}
              position={{ lat: s.lat, lng: s.lng }}
              yAnchor={1}
              zIndex={activeId === s.id ? 44 : 38}
            >
              <CoursePin
                seq={i + 1}
                role={courseRoleFor(i, courseN, startFromMe)}
                active={activeId === s.id}
                locale={locale}
                onClick={() => onPreview(s.id)}
                onHover={onHover}
                id={s.id}
              />
            </MapOverlay>
          ))}

          {/* hover 정보 팝업 — 미니시트로 미리보기 중인 마커는 중복되므로 숨김 */}
          {active && active.id !== previewId && (
            <MapOverlay
              map={mapRef.current}
              naver={naver}
              position={{ lat: active.lat, lng: active.lng }}
              yAnchor={1.55}
              zIndex={50}
            >
              <PopupCard restaurant={active} locale={locale} onClose={onClear} />
            </MapOverlay>
          )}

          {showOriginBadge && route && (
            <MapOverlay
              map={mapRef.current}
              naver={naver}
              position={route.origin}
              yAnchor={1.4}
              zIndex={46}
            >
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-md ring-2 ring-white">
                  {t(locale, 'start')}{startFromMe ? ` · ${t(locale, 'startMe')}` : ''}
                </div>
                <span className="-mt-0.5 h-2.5 w-2.5 rotate-45 rounded-sm bg-emerald-600 ring-2 ring-white" />
              </div>
            </MapOverlay>
          )}
        </>
      )}
    </div>
  )
}

/** 코스 핀 역할 — 출발(첫 집, 내 위치 모드 아님) / 도착(마지막) / 경유(중간) */
type CourseRole = 'start' | 'finish' | 'mid'
function courseRoleFor(i: number, n: number, startFromMe: boolean): CourseRole {
  if (n >= 2 && i === n - 1) return 'finish'
  if (i === 0 && !startFromMe) return 'start'
  return 'mid'
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
    let overlay: any = null
    try {
      const Overlay = getReactOverlayClass(naver)
      overlay = new Overlay({
        position: new naver.maps.LatLng(position.lat, position.lng),
        element: elRef.current!,
        xAnchor,
        yAnchor,
        zIndex,
      })
      overlay.setMap(map)
      overlayRef.current = overlay
    } catch (e) {
      // 인증 실패한 SDK 에 setMap 하면 내부 null 참조로 throw → 화면 전체 크래시 방지.
      console.warn('[map] 마커 오버레이 생성 실패:', (e as Error).message)
      return
    }
    return () => {
      try {
        overlay.setMap(null)
      } catch {
        // SDK 가 이미 깨진 상태면 정리도 throw 할 수 있어 무시
      }
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
  locale,
  active,
  onClick,
}: {
  restaurant: Restaurant
  locale: Locale
  active: boolean
  onClick: () => void
}) {
  const primary = primaryVerification(restaurant)
  const meta = primary ? getVerificationMeta(primary.code) : null
  const color = meta?.color ?? '#111827'
  const emoji = meta?.emoji ?? '📍'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={displayName(restaurant, locale)}
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
 * 코스 핀 — 순서 번호를 핀에 박고, 출발(초록)/도착(빨강)/경유(짙은 회색)를 색으로 구분.
 * 번호는 사이드바의 i+1 과 같은 배열 순서라 항상 일치한다.
 */
function CoursePin({
  id,
  seq,
  role,
  active,
  locale,
  onClick,
  onHover,
}: {
  id: string
  seq: number
  role: CourseRole
  active: boolean
  locale: Locale
  onClick: () => void
  onHover: (id: string | null) => void
}) {
  const palette: Record<CourseRole, { bg: string; label: string | null }> = {
    start: { bg: '#059669', label: t(locale, 'start') },
    finish: { bg: '#C4002B', label: t(locale, 'finish') },
    mid: { bg: '#1f2937', label: null },
  }
  const { bg, label } = palette[role]
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      aria-label={`${t(locale, 'myCourse')} ${seq}${label ? ` (${label})` : ''}`}
      className="flex flex-col items-center"
    >
      {label && (
        <span
          className="mb-0.5 rounded-full px-1.5 py-px text-[10px] font-extrabold text-white shadow ring-1 ring-white/60"
          style={{ backgroundColor: bg }}
        >
          {label}
        </span>
      )}
      <span
        className={`flex items-center justify-center rounded-full font-extrabold text-white shadow-md ring-2 transition-transform ${
          active ? 'h-9 w-9 scale-110 text-base ring-amber-300' : 'h-7 w-7 text-sm ring-white'
        }`}
        style={{ backgroundColor: bg }}
      >
        {seq}
      </span>
      <span
        className="-mt-1 h-3 w-3 rotate-45 rounded-sm ring-2 ring-white"
        style={{ backgroundColor: bg }}
      />
    </button>
  )
}

/** 진행 방향 셰브론 — 위(북)를 가리키는 화살표를 방위각만큼 회전. */
function ArrowChevron({ bearing }: { bearing: number }) {
  return (
    <div style={{ transform: `rotate(${bearing}deg)` }} className="drop-shadow">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        {/* 북쪽(위)을 향하는 화살촉. 흰 외곽 + 짙은 빨강 채움 → 선 위에서 또렷 */}
        <path
          d="M8 1 L14 13 L8 10 L2 13 Z"
          fill="#5B0016"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

/** 두 좌표의 방위각(도, 북=0 시계방향). 세그먼트 진행 방향 표시에 사용. */
function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const φ1 = toRad(a.lat)
  const φ2 = toRad(b.lat)
  const dλ = toRad(b.lng - a.lng)
  const y = Math.sin(dλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ)
  return (Math.atan2(y, x) * 180) / Math.PI
}

/**
 * 경로 path 를 따라 대략 균등 간격으로 화살표 지점을 고른다.
 * 총거리(haversine 누적) 기준으로 3~8개 정도만 — 너무 촘촘하지 않게.
 */
function arrowPoints(path: LatLng[]): { lat: number; lng: number; bearing: number }[] {
  if (path.length < 2) return []
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const d = haversineMeters(path[i - 1], path[i])
    seg.push(d)
    total += d
  }
  if (total === 0) return []
  const count = Math.min(8, Math.max(3, Math.round(total / 1200)))
  const step = total / (count + 1)
  const out: { lat: number; lng: number; bearing: number }[] = []
  let acc = 0
  let target = step
  for (let i = 1; i < path.length && out.length < count; i++) {
    acc += seg[i - 1]
    while (acc >= target && out.length < count) {
      out.push({
        lat: path[i].lat,
        lng: path[i].lng,
        bearing: bearingDeg(path[i - 1], path[i]),
      })
      target += step
    }
  }
  return out
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
  locale,
  onClose,
}: {
  restaurant: Restaurant
  locale: Locale
  onClose: () => void
}) {
  const primary = primaryVerification(restaurant)
  const accent = primary ? getVerificationMeta(primary.code).color : '#111827'

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
          aria-label={t(locale, 'close')}
          className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>

        <h3 className="pr-6 text-base font-bold text-gray-900">{displayName(restaurant, locale)}</h3>
        {restaurant.keywords.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {restaurant.keywords.slice(0, 3).map((k) => (
              <span
                key={k}
                className="inline-block rounded px-1.5 py-0.5 text-xs font-bold"
                style={{ color: accent, backgroundColor: `${accent}14` }}
              >
                #{categoryLabel(k, locale)}
              </span>
            ))}
          </div>
        )}
        {(restaurant.visitorNoteEn || restaurant.tagline) && (
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
            {restaurant.visitorNoteEn || restaurant.tagline}
          </p>
        )}
      </div>
      <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-100 bg-white" />
    </div>
  )
}
