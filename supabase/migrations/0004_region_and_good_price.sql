-- 0004_region_and_good_price.sql
-- 1) restaurants에 지역 컬럼(sido/sigungu) 추가  2) 착한가격업소 인증 타입 추가
-- 3) 기존 서울 데이터 region 백필. Supabase SQL Editor에 붙여넣어 실행. 재실행 안전.

-- 1) 지역 컬럼 (예: sido='강원특별자치도', sigungu='춘천시')
alter table public.restaurants add column if not exists sido    text;
alter table public.restaurants add column if not exists sigungu text;
create index if not exists restaurants_sigungu_idx on public.restaurants (sigungu);

-- 2) 착한가격업소(행정안전부) 인증 타입.
--    badge_color는 프론트 VERIFICATION_META.good_price.color 와 반드시 동일.
insert into public.verification_types
  (code, name_ko, name_en, authority, badge_color, weight)
values
  ('good_price', '착한가격업소', 'Good Price Store', '행정안전부', '#EA580C', 70)
on conflict (code) do nothing;

-- 3) 기존 서울 데이터(미슐랭/블루리본) region 백필 — 신규 컬럼 널 방지.
--    춘천 시드(0005)는 insert 시점에 sido/sigungu를 직접 채우므로 이 백필에 의존하지 않는다.
update public.restaurants
   set sido = '서울특별시',
       sigungu = (regexp_match(coalesce(address_road, address_jibun), '서울\S*\s+(\S+구)'))[1]
 where data_source in ('michelin_guide', 'blue_ribbon')
   and sido is null;
