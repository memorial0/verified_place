-- 0013_visitor_pilot.sql
-- 외국인 대회 방문객(2026 춘천 세계태권도품새선수권) 시연용 메타 컬럼.
--
-- 원칙(additive):
--   - 기존 컬럼 무변경. 전부 nullable / boolean default false — 백필 없어도 재실행 안전.
--   - visitor_ready 가 핵심: 초기 추천 리스트·지도에는 true 만 노출(앱에서 필터).
--     전체 춘천 데이터는 그대로 유지 → '전체 검색' 확장 시 모두 접근 가능.
--   - recommended_situation / venue_area 는 느슨한 text. 허용값 검증은 앱/seed 에서
--     (restaurant_verifications.metadata 와 동일한 "느슨한 값" 패턴).
--
-- 허용값(앱 lib/visitor 규약):
--   recommended_situation: before_match | after_match | team_dinner | family | cafe | quick_meal
--   venue_area:            near_venue | downtown | station | lakeside | south_chuncheon
--
-- ⚠️ 할랄 등 미확인 정보는 채우지 않는다(amenities 는 본 마이그레이션에서 건드리지 않음).
--    visitor_note_en / food_warning_en 은 일반적 음식 설명/주의 수준만.
--
-- 적용은 운영자가 Supabase SQL Editor 에서 직접. 본 마이그레이션은 데이터 변경 없음.

alter table public.restaurants
  add column if not exists visitor_ready          boolean not null default false,
  add column if not exists visitor_note_en        text,
  add column if not exists food_warning_en        text,
  add column if not exists recommended_situation  text,
  add column if not exists venue_area             text;

-- 부분 인덱스 — visitor_ready=true 만 빠르게 조회(초기 추천 리스트).
create index if not exists idx_restaurants_visitor_ready
  on public.restaurants (visitor_ready) where visitor_ready;

-- 뷰 재생성 — restaurant_with_verifications 는 select r.* 정의라, 테이블에 컬럼이
-- 추가되면 r.* 위치가 밀려 create or replace 가 "컬럼명 변경 불가"로 거부된다
-- (예: category_slug → sido). 그래서 drop + create 로 완전히 재정의한다.
-- r.* 라 신규 컬럼(amenities, visitor_ready, visitor_note_en, food_warning_en,
-- recommended_situation, venue_area)이 모두 자동 포함되고, category_slug/category_name/
-- verifications 도 그대로 유지된다(뷰 이름·기능 동일).
-- cascade: 이 뷰에 의존하는 객체까지 함께 정리(현재 앱은 restaurants 테이블을 직접 조회).
drop view if exists public.restaurant_with_verifications cascade;
create view public.restaurant_with_verifications
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
