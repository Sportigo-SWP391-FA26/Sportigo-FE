import { ArrowLeft, CalendarBlank, MapPin } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { Field } from '../../../components/ui/Field';
import { inputClass } from '../../../components/ui/styles';
import { formatDate, formatDateTime } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { useUserList } from '../../users/hooks/useUsers';
import { useCancelClassRegistration, useJoinClassWaitlist, usePublicClass, useRegisterForClass, useRegisterMemberOnBehalf } from '../bookingHooks';
import { isClassBookable } from '../bookingEligibility';
import type { ClassRegistrationOrder, WaitlistEntry } from '../bookingTypes';
import { sportImageUrl } from '../sportImages';

const money = (value: string | number) => `${new Intl.NumberFormat('vi-VN').format(Number(value))} ₫`;

export function GroupClassBookingDetailPage() {
  const classId = Number(useParams().classId);
  const groupClass = usePublicClass(classId);
  const registration = useRegisterForClass(classId);
  const onBehalf = useRegisterMemberOnBehalf(classId);
  const waitlist = useJoinClassWaitlist(classId);
  const cancelRegistration = useCancelClassRegistration();
  const [order, setOrder] = useState<ClassRegistrationOrder | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [staffOrder, setStaffOrder] = useState<ClassRegistrationOrder | null>(null);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassRegistrationOrder | null>(null);
  const [cancelledRegistrationId, setCancelledRegistrationId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const debouncedMemberSearch = useDebouncedValue(memberSearch.trim(), 300);
  const members = useUserList(
    { q: debouncedMemberSearch || undefined, role: 'MEMBER', status: 'ACTIVE', page: 1, pageSize: 10 },
    staffDialogOpen && !staffOrder,
  );
  const role = getSessionRole();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!Number.isInteger(classId) || classId <= 0) return <ErrorState error={new Error('ID lớp học không hợp lệ.')} />;
  if (groupClass.isPending) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ListSkeleton label="Đang tải chi tiết lớp…" /></div>;
  if (groupClass.isError) return <div className="mx-auto max-w-[1100px] px-4 py-8"><ErrorState error={groupClass.error} onRetry={() => groupClass.refetch()} retrying={groupClass.isRefetching} pendingApi="GET /api/bookings/classes/:id" /></div>;
  if (!groupClass.data) return <EmptyState title="Không tìm thấy lớp" description="Lớp không tồn tại hoặc không còn mở công khai." />;

  const item = groupClass.data;
  const submitRegistration = async () => {
    if (registration.isPending) return;
    try {
      const result = await registration.mutateAsync();
      setOrder(result);
    } catch {
      // Mutation error is rendered in the confirmation dialog.
    }
  };
  const submitOnBehalf = async () => {
    if (!selectedMemberId || onBehalf.isPending) return;
    try {
      const result = await onBehalf.mutateAsync(Number(selectedMemberId));
      setStaffOrder(result);
    } catch {
      // Mutation error is rendered in the dialog while preserving the selected Member.
    }
  };
  const submitWaitlist = async () => {
    if (waitlist.isPending) return;
    try {
      setWaitlistEntry(await waitlist.mutateAsync());
    } catch {
      // Mutation error is rendered beside the waitlist action.
    }
  };
  const confirmCancelRegistration = async () => {
    if (!cancelTarget || cancelRegistration.isPending) return;
    try {
      await cancelRegistration.mutateAsync(cancelTarget.registrationId);
      setCancelledRegistrationId(cancelTarget.registrationId);
      setCancelTarget(null);
    } catch {
      // The confirmation dialog keeps the API error visible for correction or retry.
    }
  };
  const registrationWindowOpen = isClassBookable(item, now);
  const canRegister = role === 'MEMBER' && registrationWindowOpen && item.remainingSeats > 0;
  const classListPath = role === 'RECEPTIONIST' ? '/app/class-bookings' : '/member/classes';
  const coachInitials = item.coach.user.displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:py-10">
      <section className="class-booking-hero" aria-labelledby="class-booking-title">
        <img className="class-booking-hero__image" src={sportImageUrl(item.sport)} alt={`Lớp ${item.name} · ${item.sport.name}`} />
        <div className="class-booking-hero__shade" />
        <div className="class-booking-hero__topbar">
          <ButtonLink to={classListPath} className="class-booking-hero__back"><ArrowLeft aria-hidden="true" /> Danh sách lớp</ButtonLink>
          <Chip tone={registrationWindowOpen ? 'success' : 'neutral'} dot>{registrationWindowOpen ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}</Chip>
        </div>
        <div className="class-booking-hero__content">
          <div className="class-booking-hero__copy">
            <span>{item.sport.name}</span>
            <h1 id="class-booking-title">{item.name}</h1>
            <p>{item.description ?? 'Thông tin lớp nhóm và các buổi học dự kiến.'}</p>
          </div>
          <aside className="class-booking-coach" aria-label={`Coach phụ trách: ${item.coach.user.displayName}`}>
            {item.coach.user.avatarUrl
              ? <img src={item.coach.user.avatarUrl} alt={`Coach ${item.coach.user.displayName}`} />
              : <span className="class-booking-coach__initials" aria-hidden="true">{coachInitials}</span>}
            <div><small>Coach phụ trách</small><strong>{item.coach.user.displayName}</strong><span>{item.sport.name}</span></div>
          </aside>
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5"><p className="text-xs font-bold text-muted">Coach</p><p className="mt-1 text-lg font-extrabold">{item.coach.user.displayName}</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Học phí</p><p className="mt-1 text-lg font-extrabold">{money(item.tuitionFee)}</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Chỗ còn lại</p><p className="mt-1 text-lg font-extrabold">{item.remainingSeats} / {item.capacity}</p><p className="text-xs text-muted">{item.confirmedCount} đã xác nhận</p></Card>
        <Card className="p-5"><p className="text-xs font-bold text-muted">Thời gian lớp</p><p className="mt-1 text-sm font-extrabold">{formatDate(item.startDate)} – {formatDate(item.endDate)}</p></Card>
      </div>
      <Card className="mt-4 p-5"><p className="text-sm font-bold">Cửa sổ đăng ký</p><p className="mt-1 text-sm text-muted">{formatDateTime(item.registrationOpenAt)} – {formatDateTime(item.registrationCloseAt)}</p></Card>

      <Card className="mt-5 p-5 sm:p-6">
        <SectionHeading title="Lịch các buổi học" description="Lịch và phòng được hiển thị theo dữ liệu hiện có của lớp." />
        {item.sessions.length === 0 ? (
          <EmptyState compact icon={<CalendarBlank />} title="Chưa có buổi học" description="Trung tâm chưa tạo lịch buổi cho lớp này." />
        ) : (
          <ul className="divide-y divide-line">
            {item.sessions.map((session) => (
              <li key={session.id} className="flex flex-wrap items-center gap-3 py-3">
                <CalendarBlank className="size-5 text-primary-deep" aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="font-bold">{formatDateTime(session.startsAt)} – {formatDateTime(session.endsAt).split(' ')[1]}</p>{session.note && <p className="text-xs text-muted">{session.note}</p>}</div>
                <span className="inline-flex items-center gap-1 text-sm text-muted"><MapPin aria-hidden="true" />{session.room?.name ?? 'Chưa có phòng'}</span>
                <Chip tone={session.status === 'CANCELLED' ? 'danger' : session.status === 'COMPLETED' ? 'neutral' : 'success'}>{session.status === 'CANCELLED' ? 'Đã hủy' : session.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã lên lịch'}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-extrabold">{!registrationWindowOpen ? 'Lớp không còn nhận đăng ký' : item.remainingSeats > 0 ? 'Sẵn sàng tham gia lớp?' : 'Lớp hiện đã hết chỗ'}</p>
          <p className="mt-1 text-sm text-muted">{!registrationWindowOpen ? 'Chỉ những lớp chưa bắt đầu và còn trong thời hạn đăng ký mới có thể đặt chỗ.' : item.remainingSeats > 0 ? 'Đăng ký sẽ giữ chỗ và tạo đơn chờ thanh toán. Lớp chỉ được xác nhận sau khi thanh toán thành công.' : 'Member có thể gửi yêu cầu vào danh sách chờ; tình trạng chỗ và điều kiện vẫn được backend xác nhận.'}</p>
          {role === 'MEMBER' && waitlistEntry && <p role="status" className="mt-2 text-sm font-bold text-success">Đã vào danh sách chờ ({waitlistEntry.status === 'WAITING' ? 'đang chờ' : waitlistEntry.status}).</p>}
          {role === 'MEMBER' && waitlist.isError && <p role="alert" className="mt-2 text-sm text-danger">{parseApiError(waitlist.error).message}</p>}
        </div>
        {role === 'MEMBER' ? (
          <div className="flex flex-wrap gap-2">
            {item.remainingSeats > 0 && <Button onClick={() => { registration.reset(); setConfirmOpen(true); }} disabled={!canRegister}>
              {!registrationWindowOpen ? 'Ngoài thời gian đăng ký' : 'Đăng ký lớp'}
            </Button>}
            {item.remainingSeats <= 0 && <Button onClick={submitWaitlist} loading={waitlist.isPending} disabled={!registrationWindowOpen || Boolean(waitlistEntry)}>
              {waitlistEntry ? 'Đã vào danh sách chờ' : !registrationWindowOpen ? 'Ngoài thời gian đăng ký' : 'Vào danh sách chờ'}
            </Button>}
          </div>
        ) : role === 'RECEPTIONIST' ? (
          <Button onClick={() => { setMemberSearch(''); setSelectedMemberId(''); setStaffOrder(null); setStaffDialogOpen(true); }} disabled={!registrationWindowOpen || item.remainingSeats <= 0}>
            Đăng ký hộ hội viên
          </Button>
        ) : role ? (
          <span className="text-sm text-muted">Chỉ Member được đăng ký lớp.</span>
        ) : (
          <ButtonLink to="/login">Đăng nhập để đăng ký</ButtonLink>
        )}
      </Card>

      {role === 'MEMBER' && (
        <Dialog
          open={confirmOpen || registration.isError || Boolean(order)}
          onClose={() => { if (!registration.isPending) { setConfirmOpen(false); registration.reset(); setOrder(null); } }}
          title={cancelledRegistrationId === order?.registrationId ? 'Đã gửi yêu cầu hủy đăng ký' : order ? 'Đã tạo đơn đăng ký' : registration.isError ? 'Không thể đăng ký lớp' : 'Xác nhận đăng ký'}
          description={cancelledRegistrationId === order?.registrationId ? 'Backend đã xử lý yêu cầu hủy đăng ký. Tình trạng hoàn tiền hoặc đơn thanh toán tùy theo chính sách áp dụng.' : order ? 'Chỗ đang được giữ trong thời hạn hiển thị. Hoàn tất thanh toán để xác nhận đăng ký.' : !registration.isError ? `Bạn sẽ đăng ký ${item.name} với học phí ${money(item.tuitionFee)}. Hệ thống tạo đơn chờ thanh toán và chỉ xác nhận chỗ sau khi thanh toán thành công.` : undefined}
          footer={order
            ? cancelledRegistrationId === order.registrationId
              ? <Button variant="secondary" onClick={() => { setConfirmOpen(false); setOrder(null); }}>Đóng</Button>
              : <><Button variant="danger" onClick={() => setCancelTarget(order)} disabled={cancelRegistration.isPending}>Hủy đăng ký</Button><ButtonLink to={`/member/payments?orderId=${order.orderId}`}>Tiếp tục thanh toán</ButtonLink></>
            : <><Button variant="secondary" onClick={() => { setConfirmOpen(false); registration.reset(); }}>Đóng</Button>{!registration.isError && <Button onClick={submitRegistration} loading={registration.isPending}>Xác nhận đăng ký</Button>}</>}
        >
          {order ? (
            <div className="space-y-2 text-sm">
              <p>Mã đơn: <strong>{order.orderNumber}</strong></p>
              <p>Số tiền: <strong>{money(order.amount)}</strong></p>
              <p>Giữ chỗ đến: <strong>{formatDateTime(order.expiresAt)}</strong></p>
              <p className="text-muted">Trạng thái hiện tại: Chờ thanh toán. Thanh toán thành công mới xác nhận chỗ học.</p>
            </div>
          ) : registration.isError ? <InlineAlert>{parseApiError(registration.error).message}</InlineAlert> : <p className="text-sm text-muted">Bạn có thể hủy trước khi gửi yêu cầu.</p>}
        </Dialog>
      )}
      {role === 'RECEPTIONIST' && (
        <Dialog
          open={staffDialogOpen}
          onClose={() => { if (!onBehalf.isPending) { setStaffDialogOpen(false); onBehalf.reset(); } }}
          title={staffOrder ? 'Đã tạo đơn đăng ký' : 'Đăng ký lớp cho hội viên'}
          description={staffOrder ? 'Đơn được tạo ở trạng thái chờ thanh toán. Hội viên cần thanh toán trước hạn để xác nhận chỗ.' : `Chọn hội viên đang hoạt động để đăng ký ${item.name}. Member ID được lấy từ kết quả tra cứu; không nhập ID thủ công.`}
          footer={staffOrder ? <Button variant="secondary" onClick={() => { setStaffDialogOpen(false); onBehalf.reset(); }}>Đóng</Button> : <><Button variant="secondary" onClick={() => { if (!onBehalf.isPending) { setStaffDialogOpen(false); onBehalf.reset(); } }} disabled={onBehalf.isPending}>Đóng</Button><Button onClick={submitOnBehalf} loading={onBehalf.isPending} disabled={!selectedMemberId}>Tạo đơn chờ thanh toán</Button></>}
        >
          {staffOrder ? (
            <div className="space-y-2 text-sm">
              <p>Mã đơn: <strong>{staffOrder.orderNumber}</strong></p>
              <p>Số tiền: <strong>{money(staffOrder.amount)}</strong></p>
              <p>Hạn thanh toán: <strong>{formatDateTime(staffOrder.expiresAt)}</strong></p>
              {cancelledRegistrationId === staffOrder.registrationId ? <InlineAlert>Đã gửi yêu cầu hủy đăng ký.</InlineAlert> : <>
                <Button variant="danger" onClick={() => setCancelTarget(staffOrder)} disabled={cancelRegistration.isPending}>Hủy đăng ký này</Button>
                {cancelRegistration.isError && <InlineAlert>{parseApiError(cancelRegistration.error).message}</InlineAlert>}
              </>}
            </div>
          ) : (
            <div className="space-y-4">
              <Field id="staff-member-search" label="Tìm hội viên" hint="Tìm theo tên, email, số điện thoại hoặc mã.">
                <input id="staff-member-search" type="search" className={inputClass} value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setSelectedMemberId(''); }} />
              </Field>
              {members.isPending ? <ListSkeleton rows={3} label="Đang tìm hội viên…" /> : members.isError ? <InlineAlert>Không thể tra cứu hội viên: {parseApiError(members.error).message}</InlineAlert> : members.data.items.length === 0 ? (
                <EmptyState compact title="Không tìm thấy hội viên" description="Thử từ khóa khác hoặc kiểm tra trạng thái tài khoản." />
              ) : (
                <Field id="staff-member-select" label="Hội viên" required>
                  <select id="staff-member-select" className={inputClass} value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
                    <option value="">Chọn hội viên</option>
                    {members.data.items.map((member) => <option key={member.id} value={member.id}>{member.displayName} · {member.code ?? member.email}</option>)}
                  </select>
                </Field>
              )}
              {onBehalf.isError && <InlineAlert>{parseApiError(onBehalf.error).message}</InlineAlert>}
            </div>
          )}
        </Dialog>
      )}
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Xác nhận hủy đăng ký"
        description={<p>Yêu cầu hủy đăng ký #{cancelTarget?.registrationId}. Backend sẽ kiểm tra trạng thái đơn, thời điểm buổi học đầu tiên và chính sách hủy.</p>}
        confirmLabel="Hủy đăng ký"
        tone="danger"
        loading={cancelRegistration.isPending}
        error={cancelRegistration.isError ? <InlineAlert>{parseApiError(cancelRegistration.error).message}</InlineAlert> : undefined}
        onCancel={() => { if (!cancelRegistration.isPending) { setCancelTarget(null); cancelRegistration.reset(); } }}
        onConfirm={confirmCancelRegistration}
      />
    </div>
  );
}
