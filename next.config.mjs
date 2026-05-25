/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint 미설정 상태이므로 빌드 단계 린트는 건너뜀 (타입 체크는 유지)
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig
