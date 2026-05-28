import { LoginForm } from './LoginForm'

// Cloudflare Pages 는 모든 비-static 라우트에 edge runtime 선언 필요.
// admin/layout 이 cookies() 를 쓰므로 이 페이지는 자동으로 dynamic 이 된다.
export const runtime = 'edge'

export default function AdminLoginPage() {
  return <LoginForm />
}
