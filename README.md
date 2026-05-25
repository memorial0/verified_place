# 🍽️ 검증된 맛집 (verified_place)

미슐랭 · 블루리본 · 중기부 백년가게 · 연예인 픽 등 **신뢰할 수 있는 기관/인물에게 검증된 식당만** 모아 지도와 목록으로 보여주는 웹 서비스.

- 배포: https://verified-place.pages.dev (Cloudflare Pages)
- 직접 수집한 소수 데이터로 시작 → 공공 API/크롤링으로 점진 확장

---

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 15.5.2 (App Router, TypeScript) |
| 스타일 | Tailwind CSS 3.4 |
| 지도 | react-kakao-maps-sdk (카카오맵) |
| DB/백엔드 | Supabase (PostgreSQL + PostGIS), `@supabase/ssr` |
| 배포 | Cloudflare Pages + `@cloudflare/next-on-pages` (Edge) |

---

## 주요 기능

- 카카오맵 위에 **인증 브랜드 색상별로 차등화된 커스텀 마커**
- 상단 칩 필터(전체 / 미슐랭 / 블루리본 / 백년가게 / 연예인 픽)
- **목록 ↔ 상세 패널** 2-뷰 사이드바, 지도-목록 양방향 인터랙션(hover/클릭)
- 상세 패널 하단 고정 CTA: **📍 길찾기**(좌표 기반 카카오맵 딥링크) / **★ 저장**(localStorage 영속)
- API 미연동 시 **Mock 데이터로 폴백** → 환경변수 없이도 화면 동작

---

## 프로젝트 구조

```
src/
├── app/
│   ├── (public)/page.tsx          메인 화면 (헤더 + MapExplorer)
│   ├── api/restaurants/route.ts   목록/필터/반경검색 API (Edge 런타임)
│   ├── layout.tsx, globals.css
├── components/restaurant/
│   ├── MapExplorer.tsx            지도+사이드바 컨테이너 (상태 허브)
│   ├── RestaurantMap.tsx          커스텀 마커 + 팝업 (panTo)
│   ├── RestaurantSidebar.tsx      목록 ↔ 상세 전환
│   ├── RestaurantCard.tsx         티저 카드
│   ├── RestaurantDetail.tsx       상세 패널 (+ 길찾기/저장 CTA)
│   ├── FilterChips.tsx
│   └── VerificationBadge.tsx
├── lib/
│   ├── mock/restaurants.ts        데모 데이터 5곳
│   ├── api/restaurants.ts         fetch + Mock 폴백
│   ├── hooks/                     useRestaurants, useSavedRestaurants
│   ├── supabase/                  client · server · admin
│   └── ingest/upsertRestaurants.ts  공공API/크롤링 멱등 적재
└── types/database.ts
supabase/migrations/0001_init.sql  DDL + RLS + PostGIS + 시드
```

### DB 스키마 핵심 (`supabase/migrations/0001_init.sql`)
- `restaurants` — PostGIS `location`(lat/lng 자동 생성), `data_source`+`external_id`로 다중 소스 중복 방지
- `verification_types` — 인증 종류 카탈로그(신규 인증은 ROW 추가만으로 확장)
- `restaurant_verifications` — 식당 ↔ 인증 다대다(M:N) + 유형별 메타(JSONB)
- `nearby_restaurants()` RPC(반경 거리순), 공개 읽기 RLS, 시드 데이터 포함

---

## 로컬 개발

```bash
npm install
cp .env.example .env.local   # 키 입력 (없어도 Mock으로 동작)
npm run dev
```

### 환경변수
| 변수 | 시점 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_MAP_KEY` | **빌드타임** | 카카오 JavaScript 키 |
| `NEXT_PUBLIC_SUPABASE_URL` | **빌드타임** | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **빌드타임** | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 런타임(서버) | RLS 우회 키, 절대 클라이언트 노출 금지 |

> ⚠️ `NEXT_PUBLIC_*` 변수는 **빌드 시점에 클라이언트 번들에 박힙니다(inline).** 값을 바꾸면 **반드시 재빌드 후 재배포**해야 반영됩니다. Cloudflare 대시보드의 Variables는 직접 업로드한 정적 번들에는 주입되지 않습니다.

---

## 배포 (Cloudflare Pages)

브라우저가 없는 환경이라 `wrangler login`(OAuth) 대신 **API 토큰 + 직접 업로드** 방식 사용.

```bash
# 1) 키를 박아 빌드 (NEXT_PUBLIC_* 는 이 시점에 번들에 들어감)
NEXT_PUBLIC_MAP_KEY=<카카오JS키> npx @cloudflare/next-on-pages

# 2) 빌드 산출물을 직접 업로드
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler pages deploy .vercel/output/static \
  --project-name=verified-place --branch=main
```

### 카카오맵 도메인 등록 (필수)
키를 박아도 카카오 SDK는 요청 도메인이 등록돼야 동작합니다.
- Kakao Developers → 내 앱 → 플랫폼 → Web → 사이트 도메인에 `https://verified-place.pages.dev` 추가
- 프리뷰 해시 URL(`<hash>.verified-place.pages.dev`)은 배포마다 바뀌므로 **고정 도메인**에서 테스트

---

## 현재 상태 (2026-05-25 기준)

- ✅ 프론트엔드 UI 완성 (지도/필터/목록·상세/저장 CTA)
- ✅ Cloudflare Pages 배포 + 카카오 JS 키 번들 반영
- ⏳ Supabase 미연동 — 현재 **Mock 데이터**로 구동 중
- ⏳ DB 마이그레이션(`0001_init.sql`) 아직 미적용
- ⏳ 카카오맵 도메인 등록 확인 필요

### 알려진 이슈 / TODO
- `next@15.5.2` 보안 경고(CVE) — `@cloudflare/next-on-pages` peer 상한에 묶임
- `@cloudflare/next-on-pages` deprecated (신규는 OpenNext 권장, 단 Workers 타겟)
- Supabase 연결 후 `supabase gen types`로 클라이언트 타입 강화 (현재 untyped)
