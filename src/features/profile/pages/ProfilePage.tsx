import { useState } from 'react';
import { Camera, EnvelopeSimple, IdentificationCard, ShieldCheck } from '@phosphor-icons/react';
import { Card, PageHeader } from '../../../components/ui/Card';
import { ErrorState, ListSkeleton } from '../../../components/ui/States';
import { Tabs } from '../../../components/ui/Tabs';
import { tabPanelProps } from '../../../components/ui/styles';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ProfileForm } from '../components/ProfileForm';
import { useMyProfile } from '../hooks/useMyProfile';

type ProfileTab = 'info' | 'security';

const tabs = [
  { value: 'info', label: 'Thông tin cá nhân' },
  { value: 'security', label: 'Bảo mật' },
] as const;

const TAB_PREFIX = 'profile';

// FR-05 + FR-62 · /member/profile, /coach/profile, /app/profile: cùng một trang cho mọi layout
export function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('info');
  const profile = useMyProfile();

  return (
    <div className="profile-workspace">
      {profile.data ? <section className="profile-identity">
        <div className="profile-identity__avatar">
          {profile.data.avatarUrl ? <img src={profile.data.avatarUrl} alt={`Ảnh đại diện của ${profile.data.displayName}`} /> : <span>{profile.data.displayName.trim().split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase()}</span>}
          <i aria-hidden="true"><Camera /></i>
        </div>
        <div className="profile-identity__copy"><h1>{profile.data.displayName}</h1><p>Quản lý thông tin cá nhân, liên hệ và bảo mật tài khoản Sportigo.</p><div><span><EnvelopeSimple />{profile.data.email}</span>{profile.data.member && <span><IdentificationCard />{profile.data.member.memberCode}</span>}<span><ShieldCheck />Tài khoản đang hoạt động</span></div></div>
      </section> : <PageHeader eyebrow="Tài khoản" title="Hồ sơ của tôi" description="Xem và cập nhật thông tin liên hệ của bạn." />}

      <Tabs label="Hồ sơ" idPrefix={TAB_PREFIX} tabs={tabs} value={tab} onChange={setTab} />

      <div className="mt-5" {...tabPanelProps(TAB_PREFIX, tab)}>
        {tab === 'info' ? (
          profile.isPending ? (
            <ListSkeleton rows={2} label="Đang tải hồ sơ…" />
          ) : profile.isError ? (
            <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isRefetching} />
          ) : (
            <Card className="profile-form-card p-5 sm:p-7">
              {/* note: key theo id để form khởi tạo lại defaultValues nếu đổi tài khoản */}
              <ProfileForm key={profile.data.id} profile={profile.data} />
            </Card>
          )
        ) : (
          // note: FR-62 không phụ thuộc dữ liệu hồ sơ nên hiện được ngay, kể cả khi GET /users/me đang tải hoặc lỗi
          <Card className="profile-form-card p-5 sm:p-7">
            <ChangePasswordForm />
          </Card>
        )}
      </div>
    </div>
  );
}
