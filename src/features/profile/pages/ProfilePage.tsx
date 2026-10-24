import { useState } from 'react';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { Tabs } from '../../training/components/ui/Tabs';
import { tabPanelProps } from '../../training/components/ui/styles';
import { ProfileForm } from '../components/ProfileForm';
import { useMyProfile } from '../hooks/useMyProfile';

type ProfileTab = 'info' | 'security';

const tabs = [
  { value: 'info', label: 'Thông tin cá nhân' },
  { value: 'security', label: 'Bảo mật' },
] as const;

const TAB_PREFIX = 'profile';

// FR-05 · /member/profile, /coach/profile, /app/profile: cùng một trang cho mọi layout
export function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('info');
  const profile = useMyProfile();

  return (
    <div className="mx-auto w-full max-w-[760px]">
      <PageHeader eyebrow="Tài khoản" title="Hồ sơ của tôi" description="Xem và cập nhật thông tin liên hệ của bạn." />

      <Tabs label="Hồ sơ" idPrefix={TAB_PREFIX} tabs={tabs} value={tab} onChange={setTab} />

      <div className="mt-5" {...tabPanelProps(TAB_PREFIX, tab)}>
        {tab === 'info' ? (
          profile.isPending ? (
            <ListSkeleton rows={2} label="Đang tải hồ sơ…" />
          ) : profile.isError ? (
            <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isRefetching} />
          ) : (
            <Card className="p-5 sm:p-6">
              {/* note: key theo id để form khởi tạo lại defaultValues nếu đổi tài khoản */}
              <ProfileForm key={profile.data.id} profile={profile.data} />
            </Card>
          )
        ) : (
          // TODO(FR-62): ChangePasswordForm, chờ PUT /api/users/me/password cấp phiên mới (createSession từ auth)
          <Card className="p-5 text-sm text-muted sm:p-6">Chức năng đổi mật khẩu sẽ có ở bản cập nhật tiếp theo.</Card>
        )}
      </div>
    </div>
  );
}
