import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '검증된 맛집',
  description: '믿을 수 있는 기관·인물이 인증한 식당만 모았습니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
