import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, EnvelopeSimple, LockKey } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { AuthShell } from '../components/AuthShell'
import { requestPasswordReset, resetPassword } from '../api'
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordInput, type ResetPasswordInput } from '../schema'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [complete, setComplete] = useState(false)
  const emailForm = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })
  const resetForm = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })
  const requestMutation = useMutation({ mutationFn: ({ email: value }: ForgotPasswordInput) => requestPasswordReset(value), onSuccess: (_, values) => setEmail(values.email) })
  const resetMutation = useMutation({ mutationFn: (values: ResetPasswordInput) => resetPassword(email, values), onSuccess: () => setComplete(true) })

  if (complete) return (
    <AuthShell variant="login"><div className="auth-heading auth-heading--verification"><BrandLogo className="auth-form-logo" /><CheckCircle className="auth-status-icon is-success" weight="fill" aria-hidden="true" /><h1>Mật khẩu đã được cập nhật</h1><p>Tất cả phiên đăng nhập cũ đã được đăng xuất để bảo vệ tài khoản của bạn.</p></div><Link className="auth-submit auth-submit--link" to="/login">Đăng nhập bằng mật khẩu mới</Link></AuthShell>
  )

  return (
    <AuthShell variant="login">
      <div className="auth-heading auth-heading--verification"><BrandLogo className="auth-form-logo" /><h1>{email ? 'Đặt mật khẩu mới' : 'Khôi phục mật khẩu'}</h1><p>{email ? <>Nhập mã OTP đã gửi đến <strong>{email}</strong> và tạo mật khẩu mới.</> : 'Nhập email tài khoản. Sportigo sẽ gửi mã OTP có hiệu lực trong 10 phút.'}</p></div>
      {!email ? (
        <form className="auth-form" onSubmit={emailForm.handleSubmit((values) => requestMutation.mutate(values))} noValidate>
          <label className="auth-field"><span>Địa chỉ email</span><div className={emailForm.formState.errors.email ? 'has-error' : ''}><EnvelopeSimple /><input type="email" autoComplete="email" placeholder="member@sportigo.vn" {...emailForm.register('email')} /></div>{emailForm.formState.errors.email && <small>{emailForm.formState.errors.email.message}</small>}</label>
          {requestMutation.isError && <p className="auth-alert" role="alert">Chưa thể gửi mã OTP. Vui lòng thử lại sau.</p>}
          <button className="auth-submit" type="submit" disabled={requestMutation.isPending}>{requestMutation.isPending ? 'Đang gửi mã…' : 'Gửi mã khôi phục'}</button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={resetForm.handleSubmit((values) => resetMutation.mutate(values))} noValidate>
          <label className="auth-field"><span>Mã OTP 6 số</span><div className={resetForm.formState.errors.code ? 'has-error' : ''}><EnvelopeSimple /><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" {...resetForm.register('code')} /></div>{resetForm.formState.errors.code && <small>{resetForm.formState.errors.code.message}</small>}</label>
          <label className="auth-field"><span>Mật khẩu mới</span><div className={resetForm.formState.errors.password ? 'has-error' : ''}><LockKey /><input type="password" autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" {...resetForm.register('password')} /></div>{resetForm.formState.errors.password && <small>{resetForm.formState.errors.password.message}</small>}</label>
          <label className="auth-field"><span>Xác nhận mật khẩu</span><div className={resetForm.formState.errors.confirmPassword ? 'has-error' : ''}><LockKey /><input type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" {...resetForm.register('confirmPassword')} /></div>{resetForm.formState.errors.confirmPassword && <small>{resetForm.formState.errors.confirmPassword.message}</small>}</label>
          {resetMutation.isError && <p className="auth-alert" role="alert">Mã OTP không đúng, đã hết hạn hoặc mật khẩu chưa hợp lệ.</p>}
          <button className="auth-submit" type="submit" disabled={resetMutation.isPending}>{resetMutation.isPending ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}</button>
          <button className="auth-resend" type="button" onClick={() => requestMutation.mutate({ email })} disabled={requestMutation.isPending}>Gửi lại mã OTP</button>
        </form>
      )}
      <p className="auth-switch"><Link to="/login"><ArrowLeft /> Quay lại đăng nhập</Link></p>
    </AuthShell>
  )
}
