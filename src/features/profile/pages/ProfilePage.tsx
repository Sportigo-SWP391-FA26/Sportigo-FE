import { useState } from 'react';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { Tabs } from '../../training/components/ui/Tabs';
import { tabPanelProps } from '../../training/components/ui/styles';
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
          // note: FR-62 không phụ thuộc dữ liệu hồ sơ nên hiện được ngay, kể cả khi GET /users/me đang tải hoặc lỗi
          <Card className="p-5 sm:p-6">
            <ChangePasswordForm />
          </Card>
        )}
      </div>
    </div>
  );
}
