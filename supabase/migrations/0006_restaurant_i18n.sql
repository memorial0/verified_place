-- 0006_restaurant_i18n.sql
-- 다국어(en/ja/zh) 표시 텍스트 + 번역 출처/검증 상태.
--
-- 원칙(additive):
--   - 기존 컬럼(name, tagline, reason_to_visit, description, ...)은 변경/삭제/rename 하지 않는다.
--   - name(한국어 슬롯)은 그대로 유지. 화면은 displayName(r, locale) = r.name_<locale> ?? r.name 폴백.
--   - 신규 컬럼은 전부 nullable — 백필이 없어도 재실행 안전.
--   - trigram 인덱스는 외국어 검색 UI 도입 시 별도 마이그레이션에서 추가.
--
-- 적용은 운영자가 Supabase SQL Editor 에서 직접. 본 마이그레이션은 데이터 변경 없음.

-- 1) 다국어 텍스트 컬럼 (3 필드 × 3 로케일 = 9개) -------------------------------
alter table public.restaurants
  add column if not exists name_en              text,
  add column if not exists name_ja              text,
  add column if not exists name_zh              text,
  add column if not exists tagline_en           text,
  add column if not exists tagline_ja           text,
  add column if not exists tagline_zh           text,
  add column if not exists reason_to_visit_en   text,
  add column if not exists reason_to_visit_ja   text,
  add column if not exists reason_to_visit_zh   text;

-- 2) 번역 출처/검증 상태 (단일 JSONB) ------------------------------------------
--
-- 형식: { "<column_name>": "<status>", ... }
--   예: { "name_en": "official", "tagline_ja": "verified", "reason_to_visit_zh": "auto" }
--
-- 상태값:
--   'official' — 공식 출처에서 확보 (예: 미슐랭 가이드 영문 표기, 호텔 공식 사이트)
--   'verified' — 편집팀 검수 완료
--   'auto'     — 자동 번역(기본). 키가 없으면 'auto' 로 간주한다.
--
-- 설계 메모:
--   restaurant_verifications.metadata jsonb 와 동일한 "가변 메타데이터 JSONB" 패턴.
--   컬럼별로 status 컬럼을 두면 +9개 추가(총 +18) → JSONB 1개로 압축(총 +10).
--   enum 검증은 앱/ingest 레이어에서 적용 (DB CHECK 미설정 — metadata 와 일관).
alter table public.restaurants
  add column if not exists i18n_status jsonb not null default '{}'::jsonb;

-- 3) 뷰 재정의 -----------------------------------------------------------------
--   restaurant_with_verifications 는 select r.* 정의라 신규 컬럼이 자동 반영되지 않는다.
--   (PostgreSQL 은 뷰 생성 시점에 r.* 를 현재 컬럼 리스트로 확정)
--   ⚠️ create or replace 는 컬럼 추가로 r.* 위치가 밀리면 "컬럼명 변경 불가"로 거부된다.
--   → drop + create 로 완전히 재정의(뷰 이름·기능 동일, 신규 컬럼 자동 포함).
--   cascade: 이 뷰에 의존하는 객체까지 정리(현재 앱은 restaurants 테이블을 직접 조회).
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

-- nearby_restaurants() RPC 는 returns setof public.restaurants 라 row type 가 자동 확장됨 → 재생성 불필요.
