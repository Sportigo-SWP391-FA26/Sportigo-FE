import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '../api'
import { roleHomePath, type AppRole } from '../../../components/auth/session'

type GoogleCredentialResponse = { credential?: string }
type GoogleAccounts = {
  id: {
    initialize(config: { client_id: string; callback(response: GoogleCredentialResponse): void }): void
    renderButton(element: HTMLElement, options: Record<string, string | number>): void
  }
}

declare global {
  interface Window { google?: { accounts: GoogleAccounts } }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function GoogleSignInButton() {
  const navigate = useNavigate()
  const container = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState(!GOOGLE_CLIENT_ID)
  const mutation = useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: ({ user }) => navigate(roleHomePath[user.role as AppRole] ?? '/'),
  })
  const submitCredential = mutation.mutate

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const render = () => {
      if (!window.google || !container.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => credential && submitCredential(credential),
      })
      container.current.replaceChildren()
      window.google.accounts.id.renderButton(container.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', logo_alignment: 'left', width: Math.min(420, container.current.clientWidth),
      })
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing) {
      if (window.google) render()
      else existing.addEventListener('load', render, { once: true })
      return () => existing.removeEventListener('load', render)
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.googleIdentity = 'true'
    script.addEventListener('load', render, { once: true })
    script.addEventListener('error', () => setLoadError(true), { once: true })
    document.head.appendChild(script)
    return () => script.removeEventListener('load', render)
  }, [submitCredential])

  return (
    <div className="google-sign-in">
      <div ref={container} className="google-sign-in__button" />
      {(loadError || mutation.isError) && (
        <p className="auth-alert" role="alert">
          {loadError ? 'Đăng nhập Google chưa được cấu hình.' : 'Không thể đăng nhập với Google. Vui lòng thử lại.'}
        </p>
      )}
      {mutation.isPending && <p className="auth-social-status" role="status">Đang xác thực với Google…</p>}
    </div>
  )
}
