-- 0011_opening_hours.sql
-- restaurants 에 opening_hours(jsonb, nullable) 컬럼 추가.
-- Google Places 등 외부 소스에서 수집한 영업시간을 보관. NULL = 영업시간 정보 없음(미수집/미매칭).
-- ⚠️ 기존 business_hours(jsonb not null default '{}') 와는 별개 컬럼이다. business_hours 는 건드리지 않는다.
-- Supabase SQL Editor 에 붙여넣어 실행. 재실행 안전(이미 있으면 건너뜀).

alter table public.restaurants
  add column if not exists opening_hours jsonb;
