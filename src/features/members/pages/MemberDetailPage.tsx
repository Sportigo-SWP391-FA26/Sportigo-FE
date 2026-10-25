import { ArrowLeft } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ButtonLink } from '../../training/components/ui/Button';
import { Card, PageHeader } from '../../training/components/ui/Card';
import { Chip } from '../../training/components/ui/Chip';
import { EmptyState, ErrorState, ListSkeleton } from '../../training/components/ui/States';
import { formatDate, formatDateTime } from '../../training/format';
import type { Tone } from '../../training/labels';
import { statusLabel, statusTone } from '../../users/labels';
import { useMemberProfile } from '../hooks/useMemberProfile';
import type { MemberProfile } from '../types';

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const genderLabel = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' } as const;
const orderStatusLabel: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn một phần',
};

const registrationStatus: Record<MemberProfile['classRegistrations'][number]['status'], { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'neutral' },
};

const enrollmentStatus: Record<MemberProfile['privateEnrollments'][number]['status'], { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warning' },
  ACTIVE: { label: 'Đang học', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'info' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'neutral' },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-extrabold text-ink">{title}</h2>
      {children}
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted">{children}</p>;

type Props = {
  /** Đường dẫn quay lại: /app/users cho nhân viên, /coach/members cho Coach (FR-11) */
  backTo: string;
  backLabel: string;
};

// FR-10 · hồ sơ tổng hợp hội viên; backend tự cắt dữ liệu theo quyền (Coach không thấy liên hệ, thanh toán)
export function MemberDetailPage({ backTo, backLabel }: Props) {
  const id = Number(useParams().memberId);
  const profile = useMemberProfile(id);

  const back = (
    <ButtonLink to={backTo} variant="ghost" size="sm" icon={<ArrowLeft aria-hidden="true" />} className="mb-2">
      {backLabel}
    </ButtonLink>
  );

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        {back}
        <EmptyState title="Đường dẫn không hợp lệ" description="Không xác định được hội viên cần xem." />
      </div>
    );
  }
  if (profile.isPending) return <ListSkeleton rows={4} label="Đang tải hồ sơ hội viên…" />;
  if (profile.isError) {
    return (
      <div className="mx-auto w-full max-w-[1100px]">
        {back}
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isRefetching} pendingApi="GET /api/members/:id" />
      </div>
    );
  }

  const member = profile.data;
  const isCoachView = member.scope === 'COACH';
  const info: [string, ReactNode][] = [
    ['Mã hội viên', <span className="font-mono">{member.memberCode}</span>],
    ...(isCoachView
      ? []
      : ([
          ['Email', member.email ?? '—'],
          ['Số điện thoại', member.phone ?? '—'],
        ] as [string, ReactNode][])),
    ['Ngày sinh', member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'],
    ['Giới tính', member.gender ? genderLabel[member.gender] : '—'],
    ['Liên hệ khẩn cấp', member.emergencyContact ?? '—'],
    ['Mục tiêu tập luyện', member.trainingGoal ?? '—'],
    ['Tham gia từ', formatDate(member.joinedAt)],
  ];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        back={back}
        eyebrow="Hồ sơ hội viên"
        title={member.displayName}
        description={isCoachView ? 'Chỉ hiển thị lớp, khóa 1-1 và đánh giá do bạn phụ trách.' : undefined}
        actions={
          <Chip tone={statusTone(member.status)} dot>
            {statusLabel(member.status)}
          </Chip>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Section title="Thông tin">
          <dl className="space-y-3 text-sm">
            {info.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold text-muted">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <div className="min-w-0 space-y-6">
          <Section title="Lớp nhóm">
            {member.classRegistrations.length === 0 ? (
              <Empty>Chưa đăng ký lớp nào.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {member.classRegistrations.map((registration) => {
                  const state = registrationStatus[registration.status];
                  const { attendance } = registration;
                  return (
                    <li key={registration.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink">{registration.class.name}</p>
                        <Chip tone={state.tone}>{state.label}</Chip>
                      </div>
                      <p className="text-xs text-muted">
                        {registration.class.sport} · Coach {registration.class.coach.displayName}
                        {registration.class.startDate && registration.class.endDate
                          ? ` · ${formatDate(registration.class.startDate)} – ${formatDate(registration.class.endDate)}`
                          : ''}
                      </p>
                      <p className="mt-1 text-xs text-ink">
                        Điểm danh: {attendance.present} có mặt · {attendance.late} trễ · {attendance.absent} vắng · {attendance.excused} có phép
                        {attendance.total > 0 && ` (${Math.round(((attendance.present + attendance.late) / attendance.total) * 100)}% tham gia)`}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Khóa 1-1">
            {member.privateEnrollments.length === 0 ? (
              <Empty>Chưa có khóa 1-1.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {member.privateEnrollments.map((enrollment) => {
                  const state = enrollmentStatus[enrollment.status];
                  return (
                    <li key={enrollment.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink">{enrollment.course.name}</p>
                        <Chip tone={state.tone}>{state.label}</Chip>
                      </div>
                      <p className="text-xs text-muted">
                        {enrollment.course.sport} · Coach {enrollment.coach.displayName}
                        {enrollment.expiryDate ? ` · hết hạn ${formatDate(enrollment.expiryDate)}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-ink">
                        Đã học {enrollment.usedSessions}/{enrollment.purchasedSessions} buổi · còn {enrollment.remainingSessions} buổi
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Đánh giá gần đây">
            {member.assessments.length === 0 ? (
              <Empty>Chưa có đánh giá.</Empty>
            ) : (
              <ul className="space-y-3">
                {member.assessments.map((assessment) => (
                  <li key={assessment.id} className="rounded-control border border-line p-3 text-sm">
                    <p className="text-xs text-muted">
                      {assessment.assessmentDate ? formatDate(assessment.assessmentDate) : '—'} · Coach {assessment.coach.displayName}
                      {assessment.score !== null && ` · Điểm ${assessment.score}`}
                    </p>
                    <p className="mt-1 text-ink">{assessment.coachComment}</p>
                    {assessment.recommendation && <p className="mt-1 text-xs text-muted">Đề xuất: {assessment.recommendation}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {member.payments && (
            <Section title="Thanh toán gần đây">
              {member.payments.length === 0 ? (
                <Empty>Chưa có giao dịch.</Empty>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-xs font-bold text-muted uppercase">
                      <tr>
                        <th scope="col" className="py-2 pr-4">Mã đơn</th>
                        <th scope="col" className="py-2 pr-4">Số tiền</th>
                        <th scope="col" className="py-2 pr-4">Trạng thái</th>
                        <th scope="col" className="py-2">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {member.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="py-2 pr-4 font-mono text-xs">{payment.orderNumber}</td>
                          <td className="py-2 pr-4">{payment.finalAmount === null ? '—' : vnd.format(payment.finalAmount)}</td>
                          <td className="py-2 pr-4">{orderStatusLabel[payment.status] ?? payment.status}</td>
                          <td className="py-2">{formatDateTime(payment.paidAt ?? payment.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
