# 🍽️ 검증된 맛집 (verified_place)

미슐랭 · 블루리본 · 중기부 백년가게 · 착한가격업소 · 연예인 픽 등
**신뢰할 수 있는 기관/인물에게 검증된 식당만** 모아 지도와 목록으로 보여주는 웹 서비스.

- 배포: https://verified-place.pages.dev (Cloudflare Pages)
- 직접 수집한 소수 데이터로 시작 → 공공 API/크롤링으로 점진 확장

---

## 기술 스택

| 영역 | 사용 |
|---|---|
| 프레임워크 | Next.js 15.5.2 (App Router, TypeScript) |
| 스타일 | Tailwind CSS 3.4 |
| 지도 | **네이버 지도 JS v3 SDK**(NCP Maps) — 자체 로더(`useNaverMaps`)로 직접 로딩 |
| 경로 | **네이버 Directions 5**(자동차/경유지) — `/api/directions` 프록시 |
| DB/백엔드 | Supabase (PostgreSQL + PostGIS), `@supabase/ssr` |
| 배포 | Cloudflare Pages + `@cloudflare/next-on-pages` (Edge) |

---

## 주요 기능

- 네이버 지도 위에 **인증 브랜드 색상별로 차등화된 커스텀 마커**(React 포털 + `OverlayView` 서브클래스)
- 상단 칩 필터(전체 / 미슐랭 / 블루리본 / 백년가게 / 착한가격 / 연예인 픽)
- **목록 ↔ 상세 ↔ 코스 패널** 3-뷰 사이드바, 지도-목록 양방향 인터랙션(hover/클릭)
- 마커 클릭 시 **지도 위 미니 바텀시트**(빠른 행동 3개: 길찾기 · 상세 · 코스에 추가)
- 상세 패널 하단 고정 CTA: **📍 길찾기**(인앱 자동차 경로 · Directions 5) / **★ 저장**(localStorage 영속)
- **내 코스**: 담은 순서대로 동선 구성 + 코스 전체 길찾기(경유지 최대 5, 총 7지점)
- API 미연동 시 **Mock 데이터로 폴백** → 환경변수 없이도 화면 동작

---

## 프로젝트 구조

```
src/
├── app/
│   ├── (public)/page.tsx          메인 화면 (헤더 + MapExplorer)
│   ├── api/restaurants/route.ts   목록/필터/반경검색 API (Edge 런타임)
│   ├── api/directions/route.ts    네이버 Directions 5 프록시 (Edge 런타임)
│   ├── layout.tsx, globals.css
├── components/restaurant/
│   ├── MapExplorer.tsx            지도+사이드바 컨테이너 (상태 허브)
│   ├── RestaurantMap.tsx          네이버 지도 + 커스텀 마커/팝업/경로 폴리라인
│   ├── RestaurantMiniSheet.tsx    마커 클릭 시 지도 위 미니 바텀시트
│   ├── RestaurantSidebar.tsx      목록 ↔ 상세 ↔ 코스 전환
│   ├── RestaurantCard.tsx         티저 카드
│   ├── RestaurantDetail.tsx       상세 패널 (+ 길찾기/저장 CTA)
│   ├── CoursePanel.tsx            내 코스(순서·재정렬·전체 길찾기)
│   ├── FilterChips.tsx
│   └── VerificationBadge.tsx
├── lib/
│   ├── data/                      실데이터(미슐랭·블루리본·춘천) + 통합 데이터셋
│   ├── mock/restaurants.ts        도메인 타입 + 데모 데이터 5곳
│   ├── api/restaurants.ts         fetch + Mock 폴백
│   ├── api/directions.ts          /api/directions 호출 + geolocation Promise 래퍼
│   ├── hooks/                     useRestaurants, useSavedRestaurants, useCourse, useNaverMaps
│   ├── naver/overlay.ts           네이버 OverlayView 서브클래스 (React 어댑터)
│   ├── supabase/                  client · server · admin
│   └── ingest/upsertRestaurants.ts  공공 API/크롤링 멱등 적재
└── types/database.ts
supabase/migrations/
├── 0001_init.sql                  DDL + RLS + PostGIS + nearby_restaurants RPC
├── 0002_seed_michelin_seoul.sql
├── 0003_seed_blue_ribbon.sql
├── 0004_region_and_good_price.sql
└── 0005_seed_chuncheon.sql
scripts/                            지오코딩(KAKAO_REST_KEY) + 시드 SQL 생성
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
cp .env.example .env.local   # 키 입력 (없어도 Mock 데이터로 화면은 뜸)
npm run dev
```

### 환경변수

| 변수 | 시점 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_NAVER_CLIENT_ID` | **빌드타임** | NCP Maps 애플리케이션의 Client ID — 지도 JS SDK 로딩(`ncpKeyId`) + Directions 5 호출 헤더 |
| `NAVER_CLIENT_SECRET` | 런타임(서버) | NCP Maps 애플리케이션의 Client Secret — `/api/directions` 가 `x-ncp-apigw-api-key` 헤더로 사용 |
| `NEXT_PUBLIC_SUPABASE_URL` | **빌드타임** | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **빌드타임** | Supabase anon 키 (RLS 적용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 런타임(서버) | RLS 우회 키, 절대 클라이언트 노출 금지 — ingest/scripts 전용 |
| `KAKAO_REST_KEY` | (스크립트 전용) | `scripts/geocode-*.mjs`, `scripts/import-*.mjs` 가 카카오 Local API 로 좌표/주소 해석할 때만. 앱 런타임은 사용하지 않음 |

> ⚠️ `NEXT_PUBLIC_*` 변수는 **빌드 시점에 클라이언트 번들에 박힙니다(inline).** 값을 바꾸면 **반드시 재빌드 후 재배포**해야 반영됩니다. Cloudflare 대시보드의 Variables 는 사전 빌드된 정적 번들에 주입되지 않습니다.

### 네이버 지도 도메인 등록 (필수)

키만 박아도 NCP Maps 는 **요청 도메인이 애플리케이션에 등록돼 있어야** 인증을 통과합니다.
실패는 200 응답 + 비동기 콜백(`navermap_authFailure`)으로 통지되므로, 화면엔 "지도를 불러오지 못했습니다" 안내가 뜹니다.

- NAVER Cloud Platform → AI·Application Service → **Maps** → 본 애플리케이션 → **Web 서비스 URL** 에 다음 도메인을 모두 추가
  - `http://localhost:3000` (로컬 개발)
  - `https://verified-place.pages.dev` (운영 고정 도메인)
- 프리뷰 해시 URL(`<hash>.verified-place.pages.dev`)은 배포마다 바뀌므로 **고정 도메인** 기준으로 테스트하세요.

---

## 배포 (Cloudflare Pages)

브라우저가 없는 환경에선 `wrangler login`(OAuth) 대신 **API 토큰 + 직접 업로드** 방식을 사용합니다.

```bash
# 1) NEXT_PUBLIC_* 값을 박아 빌드 (빌드 시점에 번들로 inline 됨)
NEXT_PUBLIC_NAVER_CLIENT_ID=<ncp-maps-client-id> \
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> \
  npx @cloudflare/next-on-pages

# 2) 빌드 산출물을 직접 업로드
CLOUDFLARE_API_TOKEN=<토큰> npx wrangler pages deploy .vercel/output/static \
  --project-name=verified-place --branch=main
```

> 런타임 시크릿(`NAVER_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`)은 빌드에 박지 말고 Cloudflare Pages 의
> **Environment Variables**(Production/Preview) 에 등록하세요. Edge Route Handler 에서만 읽힙니다.

---

## 데이터 파이프라인 (scripts)

미슐랭/블루리본은 공식 사이트가 자동 수집을 차단하므로, **사실 레이어(이름·등급·연도)** 만 손으로 큐레이션하고 좌표/주소는 카카오 Local API 로 해석합니다.

```bash
# 1) 사실 레이어 → 좌표/주소 해석 (geocoded JSON 생성)
KAKAO_REST_KEY=<...> node scripts/geocode-michelin.mjs
KAKAO_REST_KEY=<...> node scripts/geocode-blue-ribbon.mjs

# 2) 춘천 정부 공개데이터(CSV) → 소스별 geocoded JSON
KAKAO_REST_KEY=<...> node scripts/import-chuncheon.mjs --source good_price  --file data/raw/good-price.csv
KAKAO_REST_KEY=<...> node scripts/import-chuncheon.mjs --source centennial  --file data/raw/baengnyeon.csv
KAKAO_REST_KEY=<...> node scripts/import-chuncheon.mjs --source blue_ribbon --file data/raw/blue-ribbon-chuncheon.json

# 3) geocoded JSON → Supabase 시드 SQL
node scripts/gen-seed-sql.mjs            # → supabase/migrations/0002_seed_michelin_seoul.sql
node scripts/gen-seed-blue-ribbon.mjs    # → supabase/migrations/0003_seed_blue_ribbon.sql
node scripts/gen-seed-chuncheon.mjs      # → supabase/migrations/0005_seed_chuncheon.sql
```

생성된 시드 SQL 은 `supabase/migrations/` 에 커밋하고 Supabase 에 적용합니다.

---

## 현재 상태

- ✅ 프론트엔드 UI 완성 (지도/필터/목록·상세·코스/저장 CTA/미니 바텀시트)
- ✅ 네이버 지도 + Directions 5 인앱 길찾기(단일·코스 전체)
- ✅ Cloudflare Pages 배포 파이프라인
- ⏳ Supabase 미연동 — 현재 **Mock + geocoded JSON** 으로 구동 중
- ⏳ DB 마이그레이션 미적용 — `0001` ~ `0005` 적용 후 `/api/restaurants` 가 라이브 데이터를 돌려줌
- ⏳ NCP Maps Web 서비스 URL 에 운영 도메인 등록 확인 필요

### 알려진 이슈 / TODO
- `next@15.5.2` 보안 경고(CVE) — `@cloudflare/next-on-pages` peer 상한에 묶여 있음
- `@cloudflare/next-on-pages` deprecated (신규는 OpenNext 권장, 단 Workers 타겟)
- Supabase 연결 후 `supabase gen types` 로 클라이언트 타입 강화 (현재 손으로 작성한 `src/types/database.ts` 가 라우트에 미적용)
- 도메인 타입(`Restaurant`, `VerificationCode` 등)이 `src/lib/mock/` 에 위치 — 진짜 타입 모듈로 이전 예정
