import { useEffect } from 'react'
import { CheckCircle, EnvelopeSimple, SpinnerGap, WarningCircle } from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { AuthShell } from '../components/AuthShell'
import { resendVerification, verifyEmail } from '../api'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const email = params.get('email')
  const verification = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => verifyEmail(token!),
    enabled: Boolean(token),
    retry: false,
  })
  const resend = useMutation({ mutationFn: () => resendVerification(email!) })

  useEffect(() => {
    document.title = 'Xác minh email | Sportigo'
  }, [])

  const verified = Boolean(token && verification.isSuccess)
  const failed = Boolean(token && verification.isError)

  return (
    <AuthShell variant="login">
      <div className="auth-heading auth-heading--verification">
        <BrandLogo className="auth-form-logo" />
        {verification.isLoading && <SpinnerGap className="auth-status-icon is-loading" aria-hidden="true" />}
        {verified && <CheckCircle className="auth-status-icon is-success" weight="fill" aria-hidden="true" />}
        {failed && <WarningCircle className="auth-status-icon is-error" weight="fill" aria-hidden="true" />}
        {!token && <EnvelopeSimple className="auth-status-icon" weight="duotone" aria-hidden="true" />}
        <h1>{verification.isLoading ? 'Đang xác minh email…' : verified ? 'Tài khoản đã sẵn sàng' : failed ? 'Liên kết không còn hiệu lực' : 'Kiểm tra hộp thư của bạn'}</h1>
        <p>
          {verified
            ? 'Email đã được xác minh thành công. Bạn có thể đăng nhập và bắt đầu sử dụng Sportigo.'
            : failed
              ? 'Liên kết xác minh đã hết hạn hoặc đã được sử dụng. Bạn có thể yêu cầu gửi lại email mới.'
              : <>Chúng tôi đã gửi liên kết kích hoạt đến <strong>{email ?? 'email đăng ký'}</strong>. Liên kết có hiệu lực trong 24 giờ.</>}
        </p>
      </div>
      {verified ? (
        <Link className="auth-submit auth-submit--link" to="/login">Đăng nhập ngay</Link>
      ) : (
        <div className="auth-verification-actions">
          {email && <button className="auth-submit" type="button" onClick={() => resend.mutate()} disabled={resend.isPending}>
            {resend.isPending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
          </button>}
          {resend.isSuccess && <p className="auth-alert auth-alert--success" role="status">{resend.data.message}</p>}
          {resend.isError && <p className="auth-alert" role="alert">Chưa thể gửi email xác minh. Vui lòng thử lại sau.</p>}
          <Link to="/login">Quay lại đăng nhập</Link>
        </div>
      )}
    </AuthShell>
  )
}
