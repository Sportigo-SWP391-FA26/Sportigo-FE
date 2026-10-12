import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, EnvelopeSimple, Eye, EyeSlash, GoogleLogo, LockKey } from '@phosphor-icons/react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../../../components/brand/BrandLogo'
import { AuthShell } from '../components/AuthShell'
import { login } from '../api'
import { loginSchema, type LoginInput } from '../schema'

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => navigate(user.role === 'MEMBER' ? '/member/home' : '/dashboard'),
  })
  return (
    <AuthShell variant="login">
      <div className="auth-heading"><BrandLogo className="auth-form-logo" /><h1>Chào mừng trở lại với <span>Sport</span><em>igo</em></h1></div>
      <div className="auth-tabs"><Link className="active" to="/login">Đăng nhập</Link><Link to="/register">Đăng ký hội viên mới</Link></div>
      <form className="auth-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <label className="auth-field"><span>Email hoặc Số điện thoại</span><div className={form.formState.errors.identifier ? 'has-error' : ''}><EnvelopeSimple /><input autoComplete="username" placeholder="Nhập SĐT hoặc Email để nhận tư vấn tập luyện..." {...form.register('identifier')} /></div>{form.formState.errors.identifier && <small>{form.formState.errors.identifier.message}</small>}</label>
        <label className="auth-field"><span>Mật khẩu <a href="#forgot-password">Quên mật khẩu?</a></span><div className={form.formState.errors.password ? 'has-error' : ''}><LockKey /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu an toàn..." {...form.register('password')} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeSlash /> : <Eye />}</button></div>{form.formState.errors.password && <small>{form.formState.errors.password.message}</small>}</label>
        <label className="auth-remember"><input type="checkbox" defaultChecked /> Ghi nhớ đăng nhập trên thiết bị này</label>
        {mutation.isError && <p className="auth-alert" role="alert">Thông tin đăng nhập chưa đúng. Vui lòng kiểm tra lại.</p>}
        <button className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập vào hệ thống'}<ArrowRight /></button>
      </form>
      <div className="auth-divider"><span>HOẶC TIẾP TỤC VỚI</span></div>
      <div className="auth-social auth-social--single"><button type="button"><GoogleLogo weight="bold" />Tiếp tục với Google</button></div>
      <div className="auth-offer"><div><b>ĐẶC QUYỀN HỘI VIÊN MỚI</b><p>Trải nghiệm <strong>07 ngày miễn phí</strong> kèm 1 buổi cùng HLV cá nhân.</p></div><Link to="/register">Đăng ký ngay <ArrowRight /></Link></div>
    </AuthShell>
  )
}
