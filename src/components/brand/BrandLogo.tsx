import { Link } from 'react-router-dom'
import { getSessionRole, roleHomePath } from '../auth/session'

export function BrandLogo({ className = '' }: { className?: string }) {
  const role = getSessionRole()
  const homePath = role ? roleHomePath[role] : '/'

  return (
    <Link to={homePath} className={`brand-logo ${className}`} aria-label="Sportigo - Trang chủ">
      <img src="/brand/sportigo-logo.png" alt="Sportigo" />
    </Link>
  )
}
