/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 미설정 상태이므로 빌드 단계 린트는 건너뜀 (타입 체크는 유지)
  eslint: { ignoreDuringBuilds: true },
  // dev 모드 좌하단 인디케이터 비활성 — 시연/캡처 시 좌하단 페이저(이전)와 겹침 방지.
  // 프로덕션엔 원래 없음. dev 전용 설정.
  devIndicators: false,
}

export default nextConfig
