-- =============================================================================
-- 0001_init.sql  |  인증/검증 기반 프리미엄 레스토랑 서비스 - 초기 스키마
-- DB: Supabase (PostgreSQL 15) + PostGIS
-- 설계 원칙: 확장성 최우선 (다중 데이터 소스, 다대다 인증, 지리 검색)
-- =============================================================================

-- 1) 확장(Extensions) ---------------------------------------------------------
create extension if not exists postgis;      -- 위/경도 기반 반경 검색
create extension if not exists pg_trgm;       -- 식당명 부분 검색(유사도)
create extension if not exists pgcrypto;      -- gen_random_uuid()

-- 2) 공통 트리거 함수: updated_at 자동 갱신 -----------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) 카테고리(음식 종류) - 정규화된 룩업 테이블 ------------------------------
--    text 필드 대신 테이블로 분리 → 카테고리 추가/다국어/아이콘 확장 용이
create table public.categories (
  id          bigint generated always as identity primary key,
  slug        text   not null unique,                 -- 'korean', 'fine_dining'
  name_ko     text   not null,                         -- '한식', '파인다이닝'
  name_en     text,
  created_at  timestamptz not null default now()
);

-- 4) 레스토랑(핵심 엔티티) ----------------------------------------------------
create table public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                          -- 식당 이름
  branch_name   text,                                   -- 지점명(강남점 등), optional

  address_jibun text,                                   -- 지번 주소
  address_road  text,                                   -- 도로명 주소
  latitude      double precision,                       -- 위도
  longitude     double precision,                       -- 경도

  -- PostGIS 지리 컬럼: lat/lng로부터 자동 생성(STORED) → 반경/거리 쿼리에 사용
  location      geography(Point, 4326) generated always as (
                  case
                    when latitude is not null and longitude is not null
                    then st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
                    else null
                  end
                ) stored,

  phone         text,                                   -- 대표 전화번호
  category_id   bigint references public.categories(id) on delete set null,
  description   text,
  keywords      text[] not null default '{}',           -- 대표 키워드 태그 (#뷰맛집 등)
  tagline       text,                                   -- 한 줄 설명
  reason_to_visit text,                                 -- "이 곳을 가야 하는 이유"

  -- 노출/검수 상태
  status        text not null default 'published'
                  check (status in ('draft','published','archived','flagged')),

  -- 데이터 출처 추적 (직접 수집 → 공공 API → 크롤링 확장 대비)
  data_source   text not null default 'manual',         -- 'manual' | 'public_api_xxx' | 'crawl_naver'
  external_id   text,                                   -- 원본 소스의 식별자(중복 방지 키)

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 동일 소스의 동일 원본ID 중복 적재 방지 (크롤링/배치 idempotency)
create unique index restaurants_source_external_uq
  on public.restaurants (data_source, external_id)
  where external_id is not null;

-- 인덱스: 지리 검색(GiST) / 카테고리 / 이름 부분검색(GIN trigram)
create index restaurants_location_gix on public.restaurants using gist (location);
create index restaurants_category_idx on public.restaurants (category_id);
create index restaurants_name_trgm    on public.restaurants using gin (name gin_trgm_ops);
create index restaurants_status_idx   on public.restaurants (status);

create trigger trg_restaurants_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

-- 5) 검증 유형(인증 종류) - 룩업/디멘션 테이블 -------------------------------
--    새 인증(예: '미쉐린 그린스타')은 스키마 변경 없이 ROW 추가만으로 확장
create table public.verification_types (
  id          bigint generated always as identity primary key,
  code        text not null unique,         -- 'michelin','blue_ribbon','centennial','celebrity'
  name_ko     text not null,                -- '미슐랭','블루리본','백년가게','연예인 추천'
  name_en     text,
  authority   text,                         -- 검증 주체(미쉐린 가이드, 중소벤처기업부 등)
  description text,
  badge_color text,                         -- UI 뱃지 색상(#hex)
  icon_url    text,
  weight      int  not null default 0,      -- 신뢰도/정렬 가중치(노출 우선순위)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 6) 레스토랑 ↔ 검증유형 : 다대다(M:N) 연결 테이블 + 유형별 메타데이터 -------
--    하이브리드 설계: 관계는 정규화 junction으로, 유형별 가변 속성은 JSONB로
create table public.restaurant_verifications (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid   not null references public.restaurants(id) on delete cascade,
  verification_type_id bigint not null references public.verification_types(id) on delete restrict,

  grade        text,            -- '3_stars','bib_gourmand','selected' 등 등급 코드
  rating       numeric(3,1),    -- 미슐랭 별 개수 등 수치화 값
  awarded_year int,             -- 선정 연도 (연도별 이력 관리 가능)
  recommender  text,            -- 연예인 추천 시 추천인명
  source_url   text,            -- 증빙 출처 URL

  valid_from   date,
  valid_until  date,            -- 인증 만료/갱신(매년 갱신되는 미슐랭 등)

  is_verified  boolean not null default false,        -- 내부 검수 완료 여부
  metadata     jsonb   not null default '{}'::jsonb,  -- 유형별 가변 속성(자유 확장)

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- 같은 식당+같은 인증유형은 연도당 1건(연도별 이력은 별도 ROW로 허용)
  unique (restaurant_id, verification_type_id, awarded_year)
);

create index rv_restaurant_idx on public.restaurant_verifications (restaurant_id);
create index rv_type_idx       on public.restaurant_verifications (verification_type_id);
create index rv_metadata_gin   on public.restaurant_verifications using gin (metadata);

create trigger trg_rv_updated_at
  before update on public.restaurant_verifications
  for each row execute function public.set_updated_at();

-- 7) 조회 편의용 뷰: 식당 + 카테고리 + 검증뱃지 집계 --------------------------
--    security_invoker=on → 조회 유저의 RLS가 그대로 적용됨
create or replace view public.restaurant_with_verifications
with (security_invoker = on) as
select
  r.*,
  c.slug    as category_slug,
  c.name_ko as category_name,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code',         vt.code,
        'name_ko',      vt.name_ko,
        'grade',        rv.grade,
        'rating',       rv.rating,
        'awarded_year', rv.awarded_year,
        'recommender',  rv.recommender,
        'badge_color',  vt.badge_color
      ) order by vt.weight desc
    ) filter (where vt.id is not null),
    '[]'::jsonb
  ) as verifications
from public.restaurants r
left join public.categories c  on c.id = r.category_id
left join public.restaurant_verifications rv
       on rv.restaurant_id = r.id and rv.is_verified
left join public.verification_types vt on vt.id = rv.verification_type_id
group by r.id, c.slug, c.name_ko;

-- 8) RPC: 내 주변 검증 식당(반경 미터, 거리순) -------------------------------
create or replace function public.nearby_restaurants(
  lat double precision,
  lng double precision,
  radius_m integer default 2000,
  max_results integer default 50
)
returns setof public.restaurants
language sql
stable
as $$
  select r.*
  from public.restaurants r
  where r.location is not null
    and r.status = 'published'
    and st_dwithin(
          r.location,
          st_setsrid(st_makepoint(lng, lat), 4326)::geography,
          radius_m
        )
  order by r.location <-> st_setsrid(st_makepoint(lng, lat), 4326)::geography
  limit max_results;
$$;

-- 9) RLS(Row Level Security) --------------------------------------------------
--    공개 읽기는 허용, 쓰기는 service_role(admin 클라이언트)이 RLS 우회하여 처리.
alter table public.restaurants              enable row level security;
alter table public.categories               enable row level security;
alter table public.verification_types       enable row level security;
alter table public.restaurant_verifications enable row level security;

create policy "public read published restaurants"
  on public.restaurants for select using (status = 'published');

create policy "public read categories"
  on public.categories for select using (true);

create policy "public read active verification types"
  on public.verification_types for select using (is_active);

create policy "public read verifications"
  on public.restaurant_verifications for select using (true);

-- =============================================================================
-- 10) 시드 데이터 ------------------------------------------------------------
-- =============================================================================
insert into public.categories (slug, name_ko, name_en) values
  ('korean',       '한식',       'Korean'),
  ('japanese',     '일식',       'Japanese'),
  ('chinese',      '중식',       'Chinese'),
  ('western',      '양식',       'Western'),
  ('fine_dining',  '파인다이닝', 'Fine Dining'),
  ('cafe_dessert', '카페/디저트','Cafe & Dessert')
on conflict (slug) do nothing;

insert into public.verification_types
  (code, name_ko, name_en, authority, badge_color, weight) values
  ('michelin',   '미슐랭',      'Michelin Guide',   '미쉐린 가이드',       '#C4002B', 100),
  ('blue_ribbon','블루리본',    'Blue Ribbon Survey','블루리본 서베이',    '#1E40AF', 90),
  ('centennial', '백년가게',    'Centennial Store', '중소벤처기업부',      '#047857', 80),
  ('celebrity',  '연예인 추천', 'Celebrity Pick',   '인물 추천',           '#7C3AED', 60)
on conflict (code) do nothing;
