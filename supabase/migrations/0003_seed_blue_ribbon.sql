-- 0003_seed_blue_ribbon.sql
-- 블루리본 서베이 시드. Supabase SQL Editor에 붙여넣어 실행.
-- 재실행 안전: 기존 blue_ribbon 인증/행을 지우고 새로 넣는다.
-- 좌표/주소 출처: 카카오 Local 지오코딩 (src/lib/data/blue-ribbon.geocoded.json)
-- ⚠️ 인증 연결은 restaurants.name 매칭 기준 — 동일 이름이 여러 행이면 모두 연결될 수 있음.

-- 미슐랭 행에 붙은 blue_ribbon 인증까지 제거(restaurants 삭제 cascade로는 안 지워짐)
delete from public.restaurant_verifications
  where verification_type_id = (select id from public.verification_types where code = 'blue_ribbon');
delete from public.restaurants where data_source = 'blue_ribbon';

insert into public.restaurants
  (name, address_road, latitude, longitude, category_id, keywords, data_source, external_id, status)
values
  ('강민철레스토랑', '서울 강남구 도산대로63길 18', 37.524965745307945, 127.04368184193406, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-강민철레스토랑', 'published'),
  ('고료리켄', '서울 강남구 언주로152길 15-3', 37.52300901428518, 127.03480609700759, (select id from public.categories where slug='japanese'), ARRAY['일식','강남구'], 'blue_ribbon', 'blue-ribbon-고료리켄', 'published'),
  ('다이닝마', '서울 강남구 언주로152길 8', 37.5224974023329, 127.034267391173, (select id from public.categories where slug='chinese'), ARRAY['중국요리','강남구'], 'blue_ribbon', 'blue-ribbon-다이닝마', 'published'),
  ('더그린테이블', '서울 종로구 율곡로 83', 37.57776183677381, 126.98835777941869, (select id from public.categories where slug='western'), ARRAY['양식','종로구'], 'blue_ribbon', 'blue-ribbon-더그린테이블', 'published'),
  ('도림', '서울 중구 을지로 30', 37.5653379542771, 126.980961724646, (select id from public.categories where slug='chinese'), ARRAY['중식','중구'], 'blue_ribbon', 'blue-ribbon-도림', 'published'),
  ('도원', '서울 종로구 새문안로 9', 37.5667314839613, 126.96722571184537, (select id from public.categories where slug='chinese'), ARRAY['중국요리','종로구'], 'blue_ribbon', 'blue-ribbon-도원', 'published'),
  ('라망시크레', '서울 중구 퇴계로 67', 37.55967313924252, 126.97947145701266, (select id from public.categories where slug='western'), ARRAY['양식','중구'], 'blue_ribbon', 'blue-ribbon-라망시크레', 'published'),
  ('라미띠에', '서울 강남구 도산대로67길 30', 37.525957424367, 127.044550117941, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-라미띠에', 'published'),
  ('무오키', '서울 강남구 학동로55길 12-12', 37.519029563585256, 127.04223838500221, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-무오키', 'published'),
  ('미피아체', '서울 강남구 도산대로70길 34', 37.5214685083761, 127.044872108969, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-미피아체', 'published'),
  ('벽제갈비 더청담', '서울 강남구 도산대로81길 25', 37.5260285304664, 127.047061621629, (select id from public.categories where slug='korean'), ARRAY['갈비','강남구'], 'blue_ribbon', 'blue-ribbon-벽제갈비더청담', 'published'),
  ('본앤브레드', '서울 성동구 마장로42길 1', 37.5668051246026, 127.044520102066, (select id from public.categories where slug='korean'), ARRAY['육류,고기','성동구'], 'blue_ribbon', 'blue-ribbon-본앤브레드', 'published'),
  ('봉래헌', '서울 강서구 방화대로 94', 37.54809492886, 126.818152883016, (select id from public.categories where slug='korean'), ARRAY['한정식','강서구'], 'blue_ribbon', 'blue-ribbon-봉래헌', 'published'),
  ('비스트로 드 욘트빌', '서울 강남구 선릉로158길 13-7', 37.5260775580607, 127.041242298379, (select id from public.categories where slug='western'), ARRAY['프랑스음식','강남구'], 'blue_ribbon', 'blue-ribbon-비스트로드욘트빌', 'published'),
  ('삼원가든', '서울 강남구 언주로 835', 37.52482605288599, 127.03264282010882, (select id from public.categories where slug='korean'), ARRAY['육류,고기','강남구'], 'blue_ribbon', 'blue-ribbon-삼원가든', 'published'),
  ('세븐스도어', '서울 강남구 학동로97길 41', 37.5224033901739, 127.054310555502, (select id from public.categories where slug='korean'), ARRAY['한식','강남구'], 'blue_ribbon', 'blue-ribbon-세븐스도어', 'published'),
  ('솔밤', '서울 강남구 학동로 231', 37.515714726279604, 127.03400526007886, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-솔밤', 'published'),
  ('스시조', '서울 중구 소공로 106', 37.56449086458563, 126.98003380651808, (select id from public.categories where slug='japanese'), ARRAY['초밥,롤','중구'], 'blue_ribbon', 'blue-ribbon-스시조', 'published'),
  ('이타닉가든', '서울 강남구 테헤란로 231', 37.5028641154494, 127.04118315776, (select id from public.categories where slug='korean'), ARRAY['한식','강남구'], 'blue_ribbon', 'blue-ribbon-이타닉가든', 'published'),
  ('제로컴플렉스', '서울 용산구 서빙고로59길 11-8', 37.52084341108, 126.992854141857, (select id from public.categories where slug='western'), ARRAY['양식','용산구'], 'blue_ribbon', 'blue-ribbon-제로컴플렉스', 'published'),
  ('쵸이닷', '서울 강남구 도산대로 457', 37.524415938697466, 127.04655153958882, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-쵸이닷', 'published'),
  ('콘티넨탈', '서울 중구 동호로 249', 37.55603388052197, 127.0051743265238, (select id from public.categories where slug='western'), ARRAY['양식','중구'], 'blue_ribbon', 'blue-ribbon-콘티넨탈', 'published'),
  ('테이블포포', '서울 용산구 대사관로31길 25-12', 37.534660374914516, 127.00523847177902, (select id from public.categories where slug='western'), ARRAY['양식','용산구'], 'blue_ribbon', 'blue-ribbon-테이블포포', 'published'),
  ('파씨오네', '서울 강남구 언주로164길 39', 37.525448340313, 127.036748507093, (select id from public.categories where slug='western'), ARRAY['양식','강남구'], 'blue_ribbon', 'blue-ribbon-파씨오네', 'published'),
  ('팔선', '서울 중구 동호로 249', 37.5559762162812, 127.005183376469, (select id from public.categories where slug='chinese'), ARRAY['중식','중구'], 'blue_ribbon', 'blue-ribbon-팔선', 'published'),
  ('홍보각', '서울 강남구 봉은사로 130', 37.5052752410458, 127.028919050438, (select id from public.categories where slug='chinese'), ARRAY['중식','강남구'], 'blue_ribbon', 'blue-ribbon-홍보각', 'published'),
  ('모수서울', '서울 용산구 회나무로41길 4', 37.5411971867086, 126.996181126207, (select id from public.categories where slug='western'), ARRAY['양식','용산구'], 'blue_ribbon', 'blue-ribbon-모수서울', 'published'),
  ('하네', '서울 강남구 언주로172길 14', 37.5276365316183, 127.034907802556, (select id from public.categories where slug='japanese'), ARRAY['초밥,롤','강남구'], 'blue_ribbon', 'blue-ribbon-하네', 'published'),
  ('호빈', '서울 중구 동호로 287', 37.5601452228938, 127.002248895826, (select id from public.categories where slug='chinese'), ARRAY['중국요리','중구'], 'blue_ribbon', 'blue-ribbon-호빈', 'published'),
  ('레스쁘아', '서울 강남구 도산대로56길 10', 37.522445124497075, 127.04005702719779, (select id from public.categories where slug='western'), ARRAY['프랑스음식','강남구'], 'blue_ribbon', 'blue-ribbon-레스쁘아', 'published'),
  ('아리아께', '서울 중구 동호로 249', 37.555817640857406, 127.0051799702681, (select id from public.categories where slug='japanese'), ARRAY['일식','중구'], 'blue_ribbon', 'blue-ribbon-아리아께', 'published'),
  ('온지음', '서울 종로구 효자로 49', 37.580494739542516, 126.97339071212892, (select id from public.categories where slug='korean'), ARRAY['한식','종로구'], 'blue_ribbon', 'blue-ribbon-온지음', 'published'),
  ('가겐', '서울 강남구 압구정로80길 19-1', 37.5245020416634, 127.04524498101, (select id from public.categories where slug='japanese'), ARRAY['일식집','강남구'], 'blue_ribbon', 'blue-ribbon-가겐', 'published'),
  ('소수헌', '서울 중구 만리재로21길 8', 37.5529550203514, 126.963407745402, (select id from public.categories where slug='japanese'), ARRAY['일식집','중구'], 'blue_ribbon', 'blue-ribbon-소수헌', 'published'),
  ('명월관', '서울 광진구 워커힐로 177', 37.5529486459702, 127.110481785089, (select id from public.categories where slug='korean'), ARRAY['육류,고기','광진구'], 'blue_ribbon', 'blue-ribbon-명월관', 'published'),
  ('한국의집', '서울 중구 퇴계로36길 10', 37.5602235028532, 126.994498291875, (select id from public.categories where slug='korean'), ARRAY['한식','중구'], 'blue_ribbon', 'blue-ribbon-한국의집', 'published');

insert into public.restaurant_verifications
  (restaurant_id, verification_type_id, rating, awarded_year, is_verified)
select r.id, vt.id, v.ribbons, v.year, true
from (values
  ('강민철레스토랑', 3, 2026),
  ('고료리켄', 3, 2026),
  ('다이닝마', 3, 2026),
  ('더그린테이블', 3, 2026),
  ('도림', 3, 2026),
  ('도원', 3, 2026),
  ('라망시크레', 3, 2026),
  ('라미띠에', 3, 2026),
  ('무오키', 3, 2026),
  ('미피아체', 3, 2026),
  ('벽제갈비 더청담', 3, 2026),
  ('본앤브레드', 3, 2026),
  ('봉래헌', 3, 2026),
  ('비스트로 드 욘트빌', 3, 2026),
  ('삼원가든', 3, 2026),
  ('세븐스도어', 3, 2026),
  ('솔밤', 3, 2026),
  ('스시조', 3, 2026),
  ('이타닉가든', 3, 2026),
  ('제로컴플렉스', 3, 2026),
  ('쵸이닷', 3, 2026),
  ('콘티넨탈', 3, 2026),
  ('테이블포포', 3, 2026),
  ('파씨오네', 3, 2026),
  ('팔선', 3, 2026),
  ('홍보각', 3, 2026),
  ('밍글스', 3, 2026),
  ('정식당', 3, 2026),
  ('권숙수', 3, 2026),
  ('미토우', 3, 2026),
  ('알라 프리마', 3, 2026),
  ('모수서울', 3, 2026),
  ('하네', 3, 2026),
  ('호빈', 3, 2026),
  ('레스쁘아', 3, 2026),
  ('아리아께', 3, 2026),
  ('온지음', 3, 2026),
  ('가겐', 3, 2026),
  ('소수헌', 3, 2026),
  ('명월관', 3, 2026),
  ('한국의집', 3, 2026)
) as v(name, ribbons, year)
join public.restaurants r on r.name = v.name
join public.verification_types vt on vt.code = 'blue_ribbon';
