-- 0014_seed_visitor_pilot.sql
-- 외국인 대회 방문객 시연용 파일럿 22곳 지정 (visitor_ready=true) + 영어 설명/주의.
--
-- 선정: 춘천 인증 식당(강원특별자치도, published) 중 외국인에게 보여주기 좋은
--       대표 음식(닭갈비/막국수/순대국/칼국수/돈가스/장어/산채) 위주로 균형 선택.
--
-- ⚠️ 보수적 입력 원칙:
--   - amenities(영어메뉴/영어응대/할랄/해외카드/단체/채식)는 확실한 근거가 없어
--     본 seed 에서 건드리지 않는다 → 전부 미확인(false/빈값) 유지. 할랄은 절대 임의 true 금지.
--   - visitor_note_en / food_warning_en 은 일반적 음식 설명·주의 수준만(매운맛/돼지고기 등).
--   - recommended_situation / venue_area 는 주소 기반 보수적 추정. 확인 후 admin 에서 보정 권장.
--   - id 기준 UPDATE — 0013 적용 후 실행. 재실행 안전(idempotent).

update public.restaurants as r set
  visitor_ready = true,
  visitor_note_en = v.note,
  food_warning_en = v.warning,
  recommended_situation = v.situation,
  venue_area = v.area
from (values
  ('a3bb3cf0-c560-494c-8484-b8ce3813aee6'::uuid, 'Chuncheon''s signature dak-galbi (stir-fried chicken), cooked at your table — great for groups.', 'Sauce is spicy and contains chicken. Ask for a milder option if needed.', 'team_dinner', 'downtown'),
  ('ac7773df-7096-4b10-9741-7f29f8a8116c'::uuid, 'Long-loved local buckwheat noodle (makguksu) restaurant.', 'Cold buckwheat noodles; broth may contain meat or fish. Please ask staff if vegetarian.', 'family', 'lakeside'),
  ('23828b2b-a57e-460a-b73d-33c8a91c51c9'::uuid, 'Simple, well-known makguksu spot near the city center.', 'Broth may contain meat or fish stock. Please confirm with staff.', 'quick_meal', 'downtown'),
  ('d20aa97c-3439-435f-b0a9-db0b5d7e5f49'::uuid, 'Korean set meals featuring wild mountain vegetables (sanchae).', 'Side dishes vary; some may contain seafood or pork. Please ask.', 'family', 'south_chuncheon'),
  ('eb0f4ff6-a531-4dd1-976a-c4fcee20f0c6'::uuid, 'Hearty Korean blood-sausage soup (sundae-guk).', 'Contains pork. Not suitable if you do not eat pork.', 'quick_meal', 'downtown'),
  ('b784c981-4e51-4c4b-87bf-0d6ecaa76302'::uuid, 'Popular dak-galbi house, good for larger tables.', 'Spicy chicken dish. Ask for a mild option if needed.', 'team_dinner', 'downtown'),
  ('1d065b8f-8957-48da-af4b-a80be4588c09'::uuid, 'Home-style tofu dishes.', 'Some menus contain pork or seafood. Please ask staff.', 'family', 'downtown'),
  ('c333a577-4105-41ec-9892-c8f0868e4b85'::uuid, 'Classic alley dak-galbi restaurant.', 'Spicy; contains chicken.', 'team_dinner', 'downtown'),
  ('173884cf-b796-49b3-9632-ff8f31b762d0'::uuid, 'Large local restaurant suitable for groups.', 'Menu includes pork and seafood. Please confirm ingredients.', 'team_dinner', 'downtown'),
  ('12364fac-4271-4ca3-99d5-c28a53b0b54a'::uuid, 'Handmade knife-cut noodle soup (kalguksu) in the Myeongdong area.', 'Broth may contain seafood or meat. Please ask.', 'quick_meal', 'downtown'),
  ('c7cd8539-80f4-48a7-9d8c-cbc1152b1c23'::uuid, 'Handmade pork cutlet (donkatsu).', 'Contains pork. Not suitable if you do not eat pork.', 'quick_meal', 'downtown'),
  ('f396d14d-3a5c-4988-9ae0-b983ec13995e'::uuid, 'Pork-bone stew (gamjatang) and sundae soup.', 'Contains pork. Not suitable if you do not eat pork.', 'after_match', 'south_chuncheon'),
  ('87be9667-cdf6-408c-8516-fbdc867fa63d'::uuid, 'Grilled freshwater eel restaurant.', 'Grilled eel; sauces may contain soy or alcohol. Please ask.', 'family', 'lakeside'),
  ('0f5a9e63-396e-4ea2-a9d3-59ff6c02d00f'::uuid, 'Makguksu restaurant in the Toegye area.', 'Broth may contain meat or fish stock. Please confirm.', 'quick_meal', 'station'),
  ('c3a125d7-3029-4eba-9306-b5b19b7130c6'::uuid, 'Dak-galbi on the central Myeongdong dining street.', 'Spicy; contains chicken.', 'team_dinner', 'downtown'),
  ('2be22be4-5570-4896-a053-8eb80d758f7b'::uuid, 'Well-known dak-galbi spot.', 'Spicy chicken dish.', 'team_dinner', 'downtown'),
  ('3b260225-fac7-46f3-8f15-07e42f9136fd'::uuid, 'Spacious dak-galbi restaurant, good for teams.', 'Spicy; contains chicken.', 'team_dinner', 'south_chuncheon'),
  ('460e16ce-2a25-4abe-8c40-f6c4853408e8'::uuid, 'Country-style makguksu restaurant.', 'Broth may contain meat or fish. Please ask.', 'family', 'lakeside'),
  ('b9bfb0ef-0456-42db-a405-a44edee1289a'::uuid, 'Charcoal dak-galbi near Namchuncheon Station.', 'Spicy; contains chicken.', 'before_match', 'station'),
  ('35585948-ebd6-4b0e-be11-9caf798b22e1'::uuid, 'Charcoal-grilled dak-galbi.', 'Spicy; contains chicken.', 'team_dinner', 'downtown'),
  ('46d23d63-bcb8-4ba9-92eb-8d5723758b15'::uuid, 'Serves both makguksu and dak-galbi.', 'Spicy options; broth may contain meat or fish.', 'family', 'downtown'),
  ('029db6e9-7328-435c-b85f-ea4db82e37e1'::uuid, 'Casual Japanese-style pork cutlet (donkatsu) restaurant.', 'Contains pork. Not suitable if you do not eat pork.', 'quick_meal', 'downtown')
) as v(id, note, warning, situation, area)
where r.id = v.id;
