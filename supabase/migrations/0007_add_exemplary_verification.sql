-- 0007_add_exemplary_verification.sql
-- 모범음식점(식품위생법 47조) 인증 타입 추가.
-- 0004 의 good_price 추가와 같은 패턴 — verification_types 에 ROW 1개. 재실행 안전.
-- 데이터 시드(춘천 99곳)는 별도 0008 에서.
--
-- badge_color: 기존 5색(michelin #C4002B / blue_ribbon #1E40AF / centennial #047857 /
--              good_price #EA580C / celebrity #7C3AED) 과 중복 없는 teal-700.
--              프론트 VERIFICATION_META.exemplary.color 와 일치해야 한다.
-- weight 75 : centennial(80) 바로 아래, good_price(70) 위 — 품질 정부 인증 티어.

insert into public.verification_types
  (code, name_ko, name_en, authority, badge_color, weight)
values
  ('exemplary', '모범음식점', 'Exemplary Restaurant', '식품의약품안전처', '#0E7490', 75)
on conflict (code) do nothing;
