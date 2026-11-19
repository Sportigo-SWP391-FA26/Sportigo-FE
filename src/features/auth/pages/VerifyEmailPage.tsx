import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { CheckCircle, EnvelopeSimple, WarningCircle } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { AuthShell } from '../components/AuthShell'
import { resendVerification, verifyEmail } from '../api'

const OTP_LENGTH = 6

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [digits, setDigits] = useState(() => Array<string>(OTP_LENGTH).fill(''))
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const verification = useMutation({ mutationFn: (code: string) => verifyEmail(email, code) })
  const resend = useMutation({
    mutationFn: () => resendVerification(email),
    onSuccess: () => {
      setDigits(Array<string>(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    },
  })

  useEffect(() => {
    document.title = 'Xác minh email | Sportigo'
    inputRefs.current[0]?.focus()
  }, [])

  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((item, itemIndex) => itemIndex === index ? digit : item))
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('')
    if (!pastedDigits.length) return
    event.preventDefault()
    setDigits(Array.from({ length: OTP_LENGTH }, (_, index) => pastedDigits[index] ?? ''))
    inputRefs.current[Math.min(pastedDigits.length, OTP_LENGTH) - 1]?.focus()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || digits.some((digit) => !digit)) return
    verification.mutate(digits.join(''))
  }

  if (verification.isSuccess) {
    return (
      <AuthShell variant="login">
        <div className="auth-heading auth-heading--verification">
          <BrandLogo className="auth-form-logo" />
          <CheckCircle className="auth-status-icon is-success" weight="fill" aria-hidden="true" />
          <h1>Tài khoản đã sẵn sàng</h1>
          <p>Email đã được xác minh thành công. Bạn có thể đăng nhập và bắt đầu sử dụng Sportigo.</p>
        </div>
        <Link className="auth-submit auth-submit--link" to="/login">Đăng nhập ngay</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell variant="login">
      <div className="auth-heading auth-heading--verification">
        <BrandLogo className="auth-form-logo" />
        {verification.isError
          ? <WarningCircle className="auth-status-icon is-error" weight="fill" aria-hidden="true" />
          : <EnvelopeSimple className="auth-status-icon" weight="duotone" aria-hidden="true" />}
        <h1>Nhập mã xác minh</h1>
        <p>Chúng tôi đã gửi mã OTP 6 số đến <strong>{email || 'email đăng ký'}</strong>. Mã có hiệu lực trong 10 phút.</p>
      </div>

      <form className="auth-otp-form" onSubmit={submit}>
        <div className="auth-otp" role="group" aria-label="Mã OTP gồm 6 chữ số">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputRefs.current[index] = element }}
              value={digit}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              aria-label={`Chữ số OTP thứ ${index + 1}`}
            />
          ))}
        </div>
        {verification.isError && <p className="auth-alert" role="alert">Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại.</p>}
        <button className="auth-submit" type="submit" disabled={!email || digits.some((digit) => !digit) || verification.isPending}>
          {verification.isPending ? 'Đang xác minh…' : 'Xác minh tài khoản'}
        </button>
      </form>

      <div className="auth-verification-actions">
        <button className="auth-resend" type="button" onClick={() => resend.mutate()} disabled={!email || resend.isPending}>
          {resend.isPending ? 'Đang gửi lại…' : 'Không nhận được mã? Gửi lại OTP'}
        </button>
        {resend.isSuccess && <p className="auth-alert auth-alert--success" role="status">{resend.data.message}</p>}
        {resend.isError && <p className="auth-alert" role="alert">Chưa thể gửi mã OTP. Vui lòng thử lại sau.</p>}
        <Link to="/login">Quay lại đăng nhập</Link>
      </div>
    </AuthShell>
  )
}
