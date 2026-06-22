-- 0012_foreigner_amenities.sql
-- 외국인 관광객용 어메니티 (영어메뉴/해외카드/할랄 등) 단일 JSONB 컬럼.
--
-- 원칙(additive):
--   - 기존 컬럼은 손대지 않는다. business_hours / i18n_status 와 동일한
--     "느슨한 JSONB + admin 점진 보강" 패턴.
--   - nullable 아님 + default '{}' — 백필 없어도 재실행 안전, NULL 분기 불필요.
--   - 트리거 trg_restaurants_updated_at(0001) 가 UPDATE 시 updated_at 자동 갱신.
--
-- 형식 (앱 lib/amenities 가 따르는 규약 — DB CHECK 미설정, metadata 와 일관):
--   {
--     "english_menu":  true,   -- 영어 메뉴 있음
--     "english_staff": true,   -- 영어 가능 직원
--     "foreign_card":  true,   -- 해외카드(Visa/Master 등) 결제
--     "halal":         true,   -- 할랄 메뉴
--     "vegetarian":    true,   -- 채식 메뉴
--     "solo_ok":       true    -- 혼밥 가능
--   }
-- 모든 키 optional. 키가 없거나 false 면 미보유. 빈 객체({})면 정보 없음.
--
-- 적용은 운영자가 Supabase SQL Editor 에서 직접. 본 마이그레이션은 데이터 변경 없음.

alter table public.restaurants
  add column if not exists amenities jsonb not null default '{}'::jsonb;

-- 뷰 재생성 -------------------------------------------------------------------
--   restaurant_with_verifications 는 select r.* 정의라 신규 컬럼이 자동 반영되지 않는다
--   (PostgreSQL 은 뷰 생성 시점에 r.* 를 현재 컬럼 리스트로 확정 — 0006 동일 이슈).
--   정의 본체는 0006 과 동일하게 유지하고 create or replace 로 재해석만 시킨다.
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

-- nearby_restaurants() RPC 는 returns setof public.restaurants 라 row type 가 자동 확장됨 → 재생성 불필요.
