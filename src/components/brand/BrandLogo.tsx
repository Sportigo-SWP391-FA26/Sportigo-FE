import { Link } from 'react-router-dom'

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`brand-logo ${className}`} aria-label="Sportigo - Trang chủ">
      <img src="/brand/sportigo-logo.png" alt="Sportigo" />
    </Link>
  )
}
