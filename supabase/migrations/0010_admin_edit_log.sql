-- 0010_admin_edit_log.sql
-- 관리자 편집 감사 로그.
--
-- 목적:
--   admin 편집 폼에서 민감 필드(특히 name/branch_name 정정)를 바꿀 때 누가·언제·무엇을
--   어떻게 바꿨는지 한 줄씩 남긴다. name 정정은 외부 지도 링크 재지정과 다국어(name_en/ja/zh)
--   초기화 같은 파급이 있어, 되돌림 근거와 추적이 필요하다.
--
-- 설계:
--   - 필드 단위 1행(field, old_value, new_value). name 전용이 아니라 phone/status 등
--     모든 편집에 재사용 가능한 범용 로그.
--   - 값은 text 로 단순 보관(business_hours 같은 JSONB 는 직렬화 문자열). 감사용 스냅샷이라 충분.
--   - edited_by 는 admin 이메일(getAdminUser().email). auth.users 와 FK 로 묶지 않고 가독성
--     좋은 식별자만 보관 — 화이트리스트(ADMIN_EMAILS) 기반이라 이메일이 안정 키.
--   - on delete cascade: 식당이 하드 삭제되면 로그도 함께 정리. 실제 운영은 status='archived'
--     소프트 삭제라 로그는 통상 보존된다.
--
-- 접근 제어:
--   service_role(admin 클라이언트)만 기록/조회. RLS 를 켜되 public 정책을 두지 않아
--   anon/authenticated 는 접근 불가(fail-closed). service_role 은 RLS 를 우회한다.

create table if not exists public.restaurant_edit_log (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  field         text not null,                         -- 'name' | 'branch_name' | 'phone' | ...
  old_value     text,                                  -- 변경 전 값 (null 가능)
  new_value     text,                                  -- 변경 후 값 (null 가능)
  edited_by     text not null,                         -- 편집자 식별자(admin 이메일)
  edited_at     timestamptz not null default now()
);

-- 식당별 이력 조회 / 최근 편집순 조회용 인덱스.
create index if not exists rel_restaurant_idx on public.restaurant_edit_log (restaurant_id);
create index if not exists rel_edited_at_idx  on public.restaurant_edit_log (edited_at desc);

alter table public.restaurant_edit_log enable row level security;
-- public 읽기 정책을 의도적으로 두지 않는다 → anon/authenticated 차단(fail-closed).
-- 기록·조회는 service_role 로만 수행(RLS 우회).
