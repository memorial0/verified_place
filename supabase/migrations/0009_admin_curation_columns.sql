-- 0009_admin_curation_columns.sql
-- 관리자 큐레이션용 영업시간 컬럼 추가.
--
-- 원칙(additive):
--   - 기존 컬럼은 손대지 않는다. 추천이유는 기존 reason_to_visit, 한 줄 설명은
--     tagline, 전화번호는 phone 을 그대로 재사용한다 (새 컬럼 없음).
--   - 영업시간은 자유형식 JSONB 한 칸으로 추가. 형식 강제는 admin 편집 폼/엔드포인트에서.
--   - 트리거 trg_restaurants_updated_at(0001) 가 이미 걸려 있어 UPDATE 시 updated_at 자동 갱신.
--
-- 형식 (UI 가 따르는 규약):
--   {
--     "mon": "11:00-22:00",   -- 자유 텍스트. HH:MM-HH:MM 또는 "휴무" / "24시간" / "11:00-15:00, 17:00-22:00"
--     "tue": "11:00-22:00",
--     "wed": "11:00-22:00",
--     "thu": "11:00-22:00",
--     "fri": "11:00-23:00",
--     "sat": "11:00-23:00",
--     "sun": "휴무",
--     "note": "라스트오더 30분 전",   -- optional 메모
--     "source": "manual"               -- optional 출처: "manual"|"naver"|"public_api" 등
--   }
-- 모든 키 optional. 빈 객체({})면 영업시간 정보 없음 → 상세 패널 표시 생략.
-- restaurant_verifications.metadata 와 동일한 "느슨한 JSONB" 패턴.

alter table public.restaurants
  add column if not exists business_hours jsonb not null default '{}'::jsonb;
