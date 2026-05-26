// =============================================================================
// 블루리본 서베이 — 전국 × 전체 등급(리본 1~3) 큐레이션 (단일 소스)
//
// ▸ 검증 사실(리본 등급·연도)은 블루리본서베이 공식 발표/언론 보도 기준.
// ▸ 좌표·도로명 주소는 보유하지 않음 → 카카오 Local(키워드, 음식점 FD6) 검색으로
//   해석(geocode)한다. bluer.co.kr은 자동 수집을 차단하므로 직접 긁지 않는다.
//
// ── 수집 범위에 대한 솔직한 메모 ──────────────────────────────────────────────
//   블루리본은 「서울편」+「전국편(서울 제외)」 2권 체제다.
//   ▸ 리본3(최고)  : 공개 발표/언론으로 명단 확보 가능 → 아래에 수록.
//   ▸ 리본2        : 일부만 공개. 전국편 정식 데이터 확보 시 import 파이프라인으로 주입.
//   ▸ 리본1(수천)  : 공개 출처에 전체 명단이 없음(= 블루리본 DB 본체).
//                    정식 라이선스/제휴로 확보 후 scripts/import-blue-ribbon.mjs 로 주입.
//   현재 수록분: 서울 리본3 2026 = 43곳(미슐랭 중복 5곳 포함, 이름 매칭으로 병합).
// 출처: bluer.co.kr, 레이디경향, 하퍼스바자, Korea Times, 위키트리, namu.wiki
// =============================================================================

/** 리본 등급 (3 = 최고) */
export type Ribbons = 1 | 2 | 3

/**
 * 지오코딩/표시용 지역 힌트.
 * 카카오 키워드 검색 결과를 이 지역의 주소로 우선 채택하는 데 쓴다.
 * (예: 같은 상호가 여러 도시에 있을 때 올바른 지점 선택)
 */
export type Region =
  | '서울'
  | '부산'
  | '대구'
  | '인천'
  | '광주'
  | '대전'
  | '울산'
  | '세종'
  | '경기'
  | '강원'
  | '충북'
  | '충남'
  | '전북'
  | '전남'
  | '경북'
  | '경남'
  | '제주'

export interface BlueRibbonEntry {
  nameKo: string
  ribbons: Ribbons
  year: number
  /** 지오코딩 지역 힌트 (카카오 주소 prefix 매칭에 사용) */
  region: Region
  /** 카카오 키워드 검색 질의 (호텔 레스토랑은 호텔명 힌트 포함) */
  query: string
}

// -----------------------------------------------------------------------------
// 서울 리본3 — 2026 (총 43곳)
//   미슐랭과 겹치는 곳(밍글스·정식당·권숙수·미토우·알라프리마 등)도 포함해 두고,
//   앱 통합 시 이름이 미슐랭 데이터와 일치하면 새 행을 만들지 않고 blue_ribbon
//   인증만 기존 행에 병합한다(restaurants.ts 참고).
// -----------------------------------------------------------------------------
const SEOUL_RIBBON3_2026: BlueRibbonEntry[] = [
  { nameKo: '강민철레스토랑', ribbons: 3, year: 2026, region: '서울', query: '강민철레스토랑' },
  { nameKo: '고료리켄', ribbons: 3, year: 2026, region: '서울', query: '고료리켄' },
  { nameKo: '낙원', ribbons: 3, year: 2026, region: '서울', query: '낙원 한정식' },
  { nameKo: '다이닝마', ribbons: 3, year: 2026, region: '서울', query: '다이닝마' },
  { nameKo: '더그린테이블', ribbons: 3, year: 2026, region: '서울', query: '더그린테이블' },
  { nameKo: '도림', ribbons: 3, year: 2026, region: '서울', query: '롯데호텔 도림' },
  { nameKo: '도원', ribbons: 3, year: 2026, region: '서울', query: '도원 중식' },
  { nameKo: '라망시크레', ribbons: 3, year: 2026, region: '서울', query: '라망시크레' },
  { nameKo: '라미띠에', ribbons: 3, year: 2026, region: '서울', query: '라미띠에' },
  { nameKo: '레스쁘아', ribbons: 3, year: 2026, region: '서울', query: '레스쁘아뒤이부' },
  { nameKo: '명월관', ribbons: 3, year: 2026, region: '서울', query: '명월관 한정식' },
  { nameKo: '무오키', ribbons: 3, year: 2026, region: '서울', query: '무오키' },
  { nameKo: '미피아체', ribbons: 3, year: 2026, region: '서울', query: '미피아체' },
  { nameKo: '벽제갈비 더청담', ribbons: 3, year: 2026, region: '서울', query: '벽제갈비 더청담' },
  { nameKo: '본앤브레드', ribbons: 3, year: 2026, region: '서울', query: '본앤브레드' },
  { nameKo: '봉래헌', ribbons: 3, year: 2026, region: '서울', query: '봉래헌' },
  { nameKo: '비스트로 드 욘트빌', ribbons: 3, year: 2026, region: '서울', query: '비스트로드욘트빌' },
  { nameKo: '삼원가든', ribbons: 3, year: 2026, region: '서울', query: '삼원가든 신사' },
  { nameKo: '세븐스도어', ribbons: 3, year: 2026, region: '서울', query: '세븐스도어' },
  { nameKo: '솔밤', ribbons: 3, year: 2026, region: '서울', query: '솔밤 레스토랑' },
  { nameKo: '스시조', ribbons: 3, year: 2026, region: '서울', query: '웨스틴조선 스시조' },
  { nameKo: '아리아께', ribbons: 3, year: 2026, region: '서울', query: '롯데호텔 아리아께' },
  { nameKo: '온지음', ribbons: 3, year: 2026, region: '서울', query: '온지음 레스토랑' },
  { nameKo: '이타닉가든', ribbons: 3, year: 2026, region: '서울', query: '이타닉가든' },
  { nameKo: '제로컴플렉스', ribbons: 3, year: 2026, region: '서울', query: '제로컴플렉스' },
  { nameKo: '쵸이닷', ribbons: 3, year: 2026, region: '서울', query: '쵸이닷' },
  { nameKo: '콘티넨탈', ribbons: 3, year: 2026, region: '서울', query: '콘티넨탈 레스토랑' },
  { nameKo: '테이블포포', ribbons: 3, year: 2026, region: '서울', query: '테이블포포' },
  { nameKo: '파씨오네', ribbons: 3, year: 2026, region: '서울', query: '파씨오네' },
  { nameKo: '팔선', ribbons: 3, year: 2026, region: '서울', query: '신라호텔 팔선' },
  { nameKo: '홍보각', ribbons: 3, year: 2026, region: '서울', query: '홍보각' },
  { nameKo: '한국의집', ribbons: 3, year: 2026, region: '서울', query: '한국의집 필동' },
  // 미슐랭 중복분(이름 매칭으로 기존 미슐랭 행에 병합)
  { nameKo: '밍글스', ribbons: 3, year: 2026, region: '서울', query: '밍글스 청담' },
  { nameKo: '정식당', ribbons: 3, year: 2026, region: '서울', query: '정식당 청담' },
  { nameKo: '권숙수', ribbons: 3, year: 2026, region: '서울', query: '권숙수 청담' },
  { nameKo: '미토우', ribbons: 3, year: 2026, region: '서울', query: '미토우' },
  { nameKo: '알라 프리마', ribbons: 3, year: 2026, region: '서울', query: '알라프리마' },
  // 2026 신규 리본3 6곳
  { nameKo: '가겐', ribbons: 3, year: 2026, region: '서울', query: '가겐 가이세키' },
  { nameKo: '모수서울', ribbons: 3, year: 2026, region: '서울', query: '모수 한남' },
  { nameKo: '소수헌', ribbons: 3, year: 2026, region: '서울', query: '소수헌 스시' },
  { nameKo: '소울다이닝', ribbons: 3, year: 2026, region: '서울', query: '소울다이닝' },
  { nameKo: '하네', ribbons: 3, year: 2026, region: '서울', query: '스시하네' },
  { nameKo: '호빈', ribbons: 3, year: 2026, region: '서울', query: '호빈 중식' },
]

// -----------------------------------------------------------------------------
// 전국편(서울 제외) — 리본3 지방.
//   공개 출처(언론) 커버리지가 희박해 현재 비어 있음.
//   전국편 정식 데이터 확보 시 scripts/import-blue-ribbon.mjs 로 채운다.
// -----------------------------------------------------------------------------
const NATIONWIDE_RIBBON3: BlueRibbonEntry[] = [
  // TODO(전국편): 부산·제주·경기 등 지방 리본3 — 정식 데이터 확보 후 추가
]

/** 앱/지오코더가 사용하는 전체 블루리본 큐레이션 (단일 export) */
export const BLUE_RIBBON_ENTRIES: BlueRibbonEntry[] = [
  ...SEOUL_RIBBON3_2026,
  ...NATIONWIDE_RIBBON3,
]
