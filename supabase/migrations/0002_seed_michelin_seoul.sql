-- 0002_seed_michelin_seoul.sql
-- 미쉐린 가이드 서울 2025 별점집 시드. Supabase SQL Editor에 붙여넣어 실행.
-- 재실행 안전: 기존 michelin_guide 행을 지우고(연결 인증은 cascade 삭제) 새로 넣는다.
-- 좌표/주소 출처: 카카오 Local 지오코딩 (src/lib/data/michelin-seoul.geocoded.json)

delete from public.restaurants where data_source = 'michelin_guide';

insert into public.restaurants
  (name, address_road, latitude, longitude, category_id, keywords, data_source, external_id, status)
values
  ('밍글스', '서울 강남구 도산대로67길 19', 37.52541969265465, 127.04410633651611, (select id from public.categories where slug='korean'), ARRAY['한식','강남구'], 'michelin_guide', 'michelin-mingles', 'published'),
  ('정식당', '서울 강남구 선릉로158길 11', 37.52561179957907, 127.04107121829333, (select id from public.categories where slug='korean'), ARRAY['퓨전한식','강남구'], 'michelin_guide', 'michelin-jungsik', 'published'),
  ('라연', '서울 중구 동호로 249', 37.5558969290908, 127.005169790093, (select id from public.categories where slug='korean'), ARRAY['한식','중구'], 'michelin_guide', 'michelin-la-yeon', 'published'),
  ('권숙수', '서울 강남구 압구정로80길 37', 37.52437202380092, 127.04357628821981, (select id from public.categories where slug='korean'), ARRAY['한식','강남구'], 'michelin_guide', 'michelin-kwonsooksoo', 'published'),
  ('미토우', '서울 강남구 도산대로70길 24', 37.52211896630903, 127.04504557668946, (select id from public.categories where slug='japanese'), ARRAY['일식','강남구'], 'michelin_guide', 'michelin-mitou', 'published'),
  ('알라 프리마', '서울 강남구 학동로17길 13', 37.51353812649945, 127.0260266212748, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'michelin_guide', 'michelin-alla-prima', 'published'),
  ('에빗', '서울 강남구 도산대로45길 10-5', 37.52338340192846, 127.03623390719173, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'michelin_guide', 'michelin-evett', 'published'),
  ('레스토랑 알렌', '서울 강남구 테헤란로 231', 37.50347843657701, 127.04165283886103, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'michelin_guide', 'michelin-restaurant-allen', 'published');

insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, rating, awarded_year, is_verified)
select r.id, vt.id, v.stars, 2025, true
from (values
  ('michelin-mingles', 3),
  ('michelin-jungsik', 2),
  ('michelin-la-yeon', 2),
  ('michelin-kwonsooksoo', 2),
  ('michelin-mitou', 2),
  ('michelin-alla-prima', 2),
  ('michelin-evett', 2),
  ('michelin-restaurant-allen', 2)
) as v(external_id, stars)
join public.restaurants r
  on r.data_source = 'michelin_guide' and r.external_id = v.external_id
join public.verification_types vt on vt.code = 'michelin';
