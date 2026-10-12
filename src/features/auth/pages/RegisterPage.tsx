import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AppleLogo, ArrowRight, EnvelopeSimple, Eye, EyeSlash, GoogleLogo, LockKey, Phone, User } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { AuthShell } from '../components/AuthShell'
import { registerMember } from '../api'
import { registerSchema, type RegisterInput } from '../schema'

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const mutation = useMutation({
    mutationFn: registerMember,
    onSuccess: (result) => navigate('/verify-email?email=' + encodeURIComponent(result.email)),
  })
  return (
    <AuthShell variant="register">
      <div className="auth-heading"><BrandLogo className="auth-form-logo" /><h1>Đăng ký thành viên <span>Sport</span><em>igo</em></h1></div>
      <div className="auth-tabs"><Link to="/login">Đăng nhập</Link><Link className="active" to="/register">Đăng ký hội viên mới</Link></div>
      <form className="auth-form auth-form--register" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <div className="auth-form__row"><label className="auth-field"><span>Họ và tên <sup>*</sup></span><div className={form.formState.errors.displayName ? 'has-error' : ''}><User /><input autoComplete="name" placeholder="Nguyễn Văn A" {...form.register('displayName')} /></div>{form.formState.errors.displayName && <small>{form.formState.errors.displayName.message}</small>}</label><label className="auth-field"><span>Số điện thoại <sup>*</sup></span><div className={form.formState.errors.phone ? 'has-error' : ''}><Phone /><input inputMode="tel" autoComplete="tel" placeholder="0918 234 567" {...form.register('phone')} /></div>{form.formState.errors.phone && <small>{form.formState.errors.phone.message}</small>}</label></div>
        <label className="auth-field"><span>Địa chỉ Email <sup>*</sup></span><div className={form.formState.errors.email ? 'has-error' : ''}><EnvelopeSimple /><input type="email" autoComplete="email" placeholder="member@sportigo.vn" {...form.register('email')} /></div>{form.formState.errors.email && <small>{form.formState.errors.email.message}</small>}</label>
        <div className="auth-form__row"><label className="auth-field"><span>Mật khẩu <sup>*</sup></span><div className={form.formState.errors.password ? 'has-error' : ''}><LockKey /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Tối thiểu 8 ký tự..." {...form.register('password')} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeSlash /> : <Eye />}</button></div>{form.formState.errors.password && <small>{form.formState.errors.password.message}</small>}</label><label className="auth-field"><span>Xác nhận mật khẩu <sup>*</sup></span><div className={form.formState.errors.confirmPassword ? 'has-error' : ''}><LockKey /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Nhập lại mật khẩu..." {...form.register('confirmPassword')} /></div>{form.formState.errors.confirmPassword && <small>{form.formState.errors.confirmPassword.message}</small>}</label></div>
        <label className="auth-consent"><input type="checkbox" required defaultChecked /> Tôi đồng ý với <a href="#terms">Điều khoản dịch vụ</a> &amp; <a href="#privacy">Chính sách bảo mật</a> của Sportigo Athletic Facility.</label>
        {mutation.isError && <p className="auth-alert" role="alert">Không thể tạo tài khoản. Email hoặc số điện thoại có thể đã được sử dụng.</p>}
        <button className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang tạo tài khoản…' : 'Hoàn tất đăng ký ngay'}<ArrowRight /></button>
      </form>
      <div className="auth-divider"><span>HOẶC ĐĂNG KÝ NHANH VỚI</span></div>
      <div className="auth-social"><button type="button"><GoogleLogo weight="bold" />Google</button><button type="button"><AppleLogo weight="fill" />Apple ID</button></div>
      <p className="auth-switch">Đã có tài khoản Sportigo? <Link to="/login">Đăng nhập ngay <ArrowRight /></Link></p>
      <div className="auth-offer auth-offer--wide"><div><b>ĐẶC QUYỀN HỘI VIÊN MỚI SPORTIGO <mark>QUÀ TẶNG 1.200K</mark></b><p>Nhận ngay <strong>thẻ tập thử 07 ngày miễn phí toàn bộ 4 bộ môn</strong> + 1 buổi đo chỉ số InBody 3D cùng HLV cá nhân.</p></div></div>
    </AuthShell>
  )
}
