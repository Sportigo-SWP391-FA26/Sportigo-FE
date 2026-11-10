import { ArrowLeft, ArrowRight, CalendarBlank, CheckCircle, Clock, CurrencyCircleDollar, Receipt, ShieldCheck, UserCircle, UsersThree } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { WeeklyTimetable } from '../../../components/schedule/WeeklyTimetable';
import { Chip } from '../../../components/ui/Chip';
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { Field } from '../../../components/ui/Field';
import { inputClass } from '../../../components/ui/styles';
import { formatDate, formatDateTime } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { useDebouncedValue } from '../../training/hooks/useDebouncedValue';
import { useUserList } from '../../users/hooks/useUsers';
import { useCancelClassRegistration, useJoinClassWaitlist, useMyClassRegistrations, useMyWaitlists, usePublicClass, useRegisterForClass, useRegisterMemberOnBehalf } from '../bookingHooks';
import { isClassBookable } from '../bookingEligibility';
import type { ClassRegistrationOrder, WaitlistEntry } from '../bookingTypes';
import { sportImageUrl } from '../sportImages';
import { useMyPrivateEnrollments } from '../../private-courses/hooks/usePrivateCourses';
import { findClassScheduleConflicts } from '../scheduleConflicts';
import { RegistrationPayment } from '../components/RegistrationPayment';

const money = (value: string | number) => `${new Intl.NumberFormat('vi-VN').format(Number(value))} ₫`;

export function GroupClassBookingDetailPage() {
  const classId = Number(useParams().classId);
  const groupClass = usePublicClass(classId);
  const registration = useRegisterForClass(classId);
  const onBehalf = useRegisterMemberOnBehalf(classId);
  const waitlist = useJoinClassWaitlist(classId);
  const role = getSessionRole();
  const myRegistrations = useMyClassRegistrations(role === 'MEMBER');
  const myPrivateEnrollments = useMyPrivateEnrollments(role === 'MEMBER');
  const myWaitlists = useMyWaitlists(role === 'MEMBER');
  const cancelRegistration = useCancelClassRegistration();
  const [order, setOrder] = useState<ClassRegistrationOrder | null>(null);
  const [orderPaid, setOrderPaid] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [staffOrder, setStaffOrder] = useState<ClassRegistrationOrder | null>(null);
  const [waitlistEntry, setWaitlistEntry] = useState<WaitlistEntry | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ registrationId: number } | null>(null);
  const [cancelledRegistrationId, setCancelledRegistrationId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const debouncedMemberSearch = useDebouncedValue(memberSearch.trim(), 300);
  const members = useUserList(
    { q: debouncedMemberSearch || undefined, role: 'MEMBER', status: 'ACTIVE', page: 1, pageSize: 10 },
    staffDialogOpen && !staffOrder,
  );
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
      setOrderPaid(false);
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
  const activeRegistration = myRegistrations.data?.find((entry) => entry.classId === classId);
  const activeWaitlist = myWaitlists.data?.find((entry) => entry.classId === classId && ['WAITING', 'OFFERED', 'ACCEPTED'].includes(entry.status));
  const canRegister = role === 'MEMBER' && registrationWindowOpen && item.remainingSeats > 0 && !activeRegistration && !activeWaitlist;
  const firstSessionStart = item.sessions[0]?.startsAt ?? item.startDate;
  const hoursUntilFirstSession = (new Date(firstSessionStart).getTime() - now) / 3_600_000;
  const classListPath = role === 'RECEPTIONIST' ? '/app/class-bookings' : '/member/classes';
  const coachInitials = item.coach.user.displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const coachSpecialties = item.coach.coachSports?.map(({ sport }) => sport.name) ?? [];
  const coachActive = !item.coach.status || item.coach.status === 'ACTIVE';
  const conflicts = role === 'MEMBER' && myRegistrations.data && myPrivateEnrollments.data
    ? findClassScheduleConflicts(classId, item.sessions, myRegistrations.data, myPrivateEnrollments.data)
    : new Map<number, string[]>();

  return (
    <div className="mx-auto w-full max-w-[1480px] px-3 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <main className="grid min-w-0 gap-5">
      <section className="class-booking-hero !mb-0" aria-labelledby="class-booking-title">
        <img className="class-booking-hero__image" src={sportImageUrl(item.sport)} alt={`Lớp ${item.name} · ${item.sport.name}`} />
        <div className="class-booking-hero__shade" />
        <div className="class-booking-hero__topbar">
          <ButtonLink to={classListPath} className="class-booking-hero__back"><ArrowLeft aria-hidden="true" /> Danh sách lớp</ButtonLink>
          <Chip tone={registrationWindowOpen ? 'success' : 'neutral'} dot className="class-booking-status">{registrationWindowOpen ? 'Đang mở đăng ký' : 'Đã đóng đăng ký'}</Chip>
        </div>
        <div className="class-booking-hero__content">
          <div className="class-booking-hero__copy">
            <span>{item.sport.name}</span>
            <h1 id="class-booking-title">{item.name}</h1>
            <p>{item.description ?? 'Thông tin lớp nhóm và các buổi học dự kiến.'}</p>
          </div>
        </div>
      </section>
        <Card className="min-w-0 p-5 sm:p-6">
          <SectionHeading title="Lịch các buổi học" description="Hai buổi mỗi tuần, kèm giờ học và phòng tập cụ thể." />
          {item.sessions.length === 0 ? (
            <EmptyState compact icon={<CalendarBlank />} title="Chưa có buổi học" description="Trung tâm chưa tạo lịch buổi cho lớp này." />
          ) : (
            <WeeklyTimetable items={item.sessions.map((session) => ({
              id: session.id,
              dayOfWeek: new Date(session.startsAt).getDay(),
              date: session.startsAt,
              time: `${formatDateTime(session.startsAt).split(' ')[1]}–${formatDateTime(session.endsAt).split(' ')[1]}`,
              title: formatDateTime(session.startsAt).split(' ')[0],
              subtitle: `${session.room?.name ?? 'Chưa có phòng'}${session.note ? ` · ${session.note}` : ''}`,
              tone: conflicts.has(session.id) ? 'danger' as const : session.status === 'CANCELLED' ? 'danger' as const : session.status === 'COMPLETED' ? 'neutral' as const : 'success' as const,
              content: session.status === 'CANCELLED'
                ? <Chip tone="danger">Đã hủy</Chip>
                : conflicts.has(session.id)
                  ? <span className="text-xs font-extrabold">Trùng lịch · {conflicts.get(session.id)?.join(', ')}</span>
                : session.status === 'COMPLETED'
                  ? <Chip tone="neutral">Đã hoàn thành</Chip>
                  : undefined,
            }))} />
          )}
          {role === 'MEMBER' && (myRegistrations.isPending || myPrivateEnrollments.isPending) && <p className="mt-3 text-sm text-muted">Đang đối chiếu lịch học của bạn…</p>}
          {role === 'MEMBER' && (myRegistrations.isError || myPrivateEnrollments.isError) && <InlineAlert>Chưa thể đối chiếu lịch cá nhân. Vui lòng thử lại trước khi đăng ký.</InlineAlert>}
          {conflicts.size > 0 && <p role="note" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">Các ca nền đỏ trùng với lịch học đã xác nhận của bạn. Hãy chọn lớp có lịch phù hợp trước khi đăng ký.</p>}
        </Card>
      </main>

        <aside className="grid gap-4 xl:sticky xl:top-24" aria-label="Thông tin lớp và Coach">
          <Card className="overflow-hidden p-0">
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 p-4">
              {item.coach.user.avatarUrl
                ? <img className="h-36 w-28 rounded-xl object-cover object-top" src={item.coach.user.avatarUrl} alt={`Coach ${item.coach.user.displayName}`} />
                : <span className="grid h-36 w-28 place-items-center rounded-xl bg-primary text-2xl font-extrabold text-white" aria-hidden="true">{coachInitials}</span>}
              <div className="min-w-0 self-center">
                <p className="text-xs font-extrabold uppercase tracking-wide text-primary">Coach phụ trách</p>
                <h2 className="mt-1 text-xl font-extrabold leading-tight text-ink">{item.coach.user.displayName}</h2>
                <p className="mt-1 text-xs font-bold text-muted">{item.coach.coachCode ?? 'Coach Sportigo'}</p>
                <Chip tone={coachActive ? 'success' : 'neutral'} dot>{coachActive ? 'Đang hoạt động' : item.coach.status === 'ON_LEAVE' ? 'Đang nghỉ phép' : 'Tạm ngưng'}</Chip>
              </div>
            </div>
            <div className="border-t border-line px-4 py-4">
              <p className="text-xs font-bold text-muted">Chuyên môn</p>
              <div className="mt-2 flex flex-wrap gap-2">{(coachSpecialties.length ? coachSpecialties : [item.sport.name]).map((name) => <span key={name} className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary-deep">{name}</span>)}</div>
              <p className="mt-4 text-sm leading-relaxed text-muted">{item.coach.bio ?? `Coach phụ trách chương trình ${item.sport.name}, theo dõi kỹ thuật và tiến độ của học viên trong suốt khóa học.`}</p>
              {item.coach.hiredAt && <p className="mt-3 text-xs text-muted">Tham gia Sportigo từ <strong className="text-ink">{formatDate(item.coach.hiredAt)}</strong></p>}
            </div>
          </Card>

          <Card className="order-3 p-5">
            <h2 className="text-base font-extrabold text-ink">Thông tin lớp</h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0"><dt className="text-muted">Học phí</dt><dd className="font-extrabold text-primary-deep">{money(item.tuitionFee)}</dd></div>
              <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted">Chỗ còn lại</dt><dd className="text-right font-extrabold">{item.remainingSeats} / {item.capacity}<small className="block font-medium text-muted">{item.confirmedCount} đã xác nhận</small></dd></div>
              <div className="py-3"><dt className="text-muted">Thời gian khóa</dt><dd className="mt-1 font-bold">{formatDate(item.startDate)} – {formatDate(item.endDate)}</dd></div>
              <div className="py-3 last:pb-0"><dt className="text-muted">Thời hạn đăng ký</dt><dd className="mt-1 font-bold">Đến {formatDateTime(item.registrationCloseAt)}</dd></div>
            </dl>
          </Card>

          <Card className="order-2 p-5">
            <p className="font-extrabold">{!registrationWindowOpen ? 'Lớp không còn nhận đăng ký' : item.remainingSeats > 0 ? 'Sẵn sàng tham gia lớp?' : 'Lớp hiện đã hết chỗ'}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{activeRegistration ? 'Bạn đã đăng ký lớp này. Một hội viên không thể đăng ký lại hoặc vào danh sách chờ cùng lớp.' : activeWaitlist ? 'Bạn đã có tên trong danh sách chờ của lớp.' : !registrationWindowOpen ? 'Chỉ lớp chưa bắt đầu và còn trong thời hạn mới có thể đặt chỗ.' : item.remainingSeats > 0 ? 'Tạo đơn và hoàn tất thanh toán để xác nhận chỗ.' : 'Bạn có thể tham gia danh sách chờ của lớp.'}</p>
            {role === 'MEMBER' && waitlistEntry && <p role="status" className="mt-3 text-sm font-bold text-success">Đã vào danh sách chờ ({waitlistEntry.status === 'WAITING' ? 'đang chờ' : waitlistEntry.status}).</p>}
            {role === 'MEMBER' && waitlist.isError && <p role="alert" className="mt-3 text-sm text-danger">{parseApiError(waitlist.error).message}</p>}
            <div className="mt-4 grid gap-2">
              {role === 'MEMBER' ? <>
                {activeRegistration ? <><ButtonLink to="/member/my-schedule">Xem đăng ký của tôi</ButtonLink>{hoursUntilFirstSession > 0 && <Button variant="secondary" onClick={() => { cancelRegistration.reset(); setCancelTarget({ registrationId: activeRegistration.id }); }}>Hủy đăng ký</Button>}</> : activeWaitlist ? <Button disabled>Đã vào danh sách chờ</Button> : <>
                  {item.remainingSeats > 0 && <Button onClick={() => { registration.reset(); setConfirmOpen(true); }} disabled={!canRegister || myRegistrations.isPending || myWaitlists.isPending}>{!registrationWindowOpen ? 'Ngoài thời gian đăng ký' : 'Đăng ký lớp'}</Button>}
                  {item.remainingSeats <= 0 && <Button onClick={submitWaitlist} loading={waitlist.isPending} disabled={!registrationWindowOpen || Boolean(waitlistEntry) || myRegistrations.isPending || myWaitlists.isPending}>{waitlistEntry ? 'Đã vào danh sách chờ' : !registrationWindowOpen ? 'Ngoài thời gian đăng ký' : 'Vào danh sách chờ'}</Button>}
                </>}
              </> : role === 'RECEPTIONIST' ? (
                <Button onClick={() => { setMemberSearch(''); setSelectedMemberId(''); setStaffOrder(null); setStaffDialogOpen(true); }} disabled={!registrationWindowOpen || item.remainingSeats <= 0}>Đăng ký hộ hội viên</Button>
              ) : role ? <span className="text-sm text-muted">Chỉ Member được đăng ký lớp.</span> : <ButtonLink to="/login">Đăng nhập để đăng ký</ButtonLink>}
            </div>
          </Card>
        </aside>
      </div>

      {role === 'MEMBER' && (
        <Dialog
          open={confirmOpen || registration.isError || Boolean(order)}
          onClose={() => { if (!registration.isPending) { setConfirmOpen(false); registration.reset(); setOrder(null); } }}
          title={cancelledRegistrationId === order?.registrationId ? 'Đã gửi yêu cầu hủy đăng ký' : order ? 'Đăng ký thành công' : registration.isError ? 'Không thể đăng ký lớp' : 'Xác nhận đăng ký'}
          description={cancelledRegistrationId === order?.registrationId ? 'Backend đã xử lý yêu cầu hủy đăng ký. Tình trạng hoàn tiền hoặc đơn thanh toán tùy theo chính sách áp dụng.' : order ? 'Chỗ đang được giữ trong thời hạn hiển thị. Hoàn tất thanh toán để xác nhận đăng ký.' : !registration.isError ? 'Kiểm tra thông tin lớp trước khi tạo đơn thanh toán.' : undefined}
          size={order ? 'xl' : 'lg'}
          footer={order
            ? cancelledRegistrationId === order.registrationId
              ? <Button variant="secondary" onClick={() => { setConfirmOpen(false); setOrder(null); }}>Đóng</Button>
              : <>{!orderPaid && <Button variant="danger" onClick={() => setCancelTarget(order)} disabled={cancelRegistration.isPending}>Hủy đăng ký</Button>}<ButtonLink to={`/member/payments?orderId=${order.orderId}`} variant="secondary">Xem chi tiết đơn <ArrowRight aria-hidden="true" /></ButtonLink></>
            : <><Button variant="secondary" onClick={() => { setConfirmOpen(false); registration.reset(); }}>Đóng</Button>{!registration.isError && <Button onClick={submitRegistration} loading={registration.isPending}>Xác nhận đăng ký</Button>}</>}
        >
          {order ? (
            <div className="registration-success">
              <div className="registration-success__hero">
                <span><CheckCircle weight="fill" aria-hidden="true" /></span>
                <div><strong>Yêu cầu đăng ký đã được ghi nhận</strong><p>Sportigo đang tạm giữ chỗ cho bạn trong thời hạn thanh toán.</p></div>
              </div>
              <ol className="registration-success__steps" aria-label="Tiến trình đăng ký lớp">
                <li className="is-complete"><span><CheckCircle weight="fill" /></span><div><strong>Đăng ký</strong><small>Hoàn tất</small></div></li>
                <li className={orderPaid ? 'is-complete' : 'is-current'}><span>{orderPaid ? <CheckCircle weight="fill" /> : '2'}</span><div><strong>Thanh toán</strong><small>{orderPaid ? 'Hoàn tất' : 'Đang chờ'}</small></div></li>
                <li className={orderPaid ? 'is-complete' : ''}><span>{orderPaid ? <CheckCircle weight="fill" /> : '3'}</span><div><strong>Xác nhận lớp</strong><small>{orderPaid ? 'Đã xác nhận' : 'Sau thanh toán'}</small></div></li>
              </ol>
              <div className="registration-success__receipt">
                <div className="registration-success__receipt-head"><Receipt aria-hidden="true" /><span>Thông tin đơn đăng ký</span></div>
                <dl>
                  <div><dt>Lớp học</dt><dd>{item.name}</dd></div>
                  <div><dt>Mã đơn</dt><dd>{order.orderNumber}</dd></div>
                  <div><dt>Trạng thái</dt><dd><span className="registration-success__status">{orderPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}</span></dd></div>
                  <div className="registration-success__total"><dt>Học phí trước ưu đãi</dt><dd>{money(order.amount)}</dd></div>
                </dl>
              </div>
              {!orderPaid && <div className="registration-success__expiry">
                <Clock weight="fill" aria-hidden="true" />
                <div><span>Hoàn tất thanh toán trước</span><strong>{formatDateTime(order.expiresAt)}</strong><p>Đơn có thể tự động hết hạn và chỗ sẽ được mở lại nếu bạn thanh toán trễ.</p></div>
              </div>}
              {cancelledRegistrationId !== order.registrationId && <RegistrationPayment orderId={order.orderId} onPaid={() => setOrderPaid(true)} />}
            </div>
          ) : registration.isError ? <InlineAlert>{parseApiError(registration.error).message}</InlineAlert> : (
            <div className="registration-confirm">
              <div className="registration-confirm__summary">
                <img src={sportImageUrl(item.sport)} alt={`Minh họa lớp ${item.name}`} />
                <div>
                  <span>{item.sport.name}</span>
                  <strong>{item.name}</strong>
                  <p>{item.description ?? 'Lớp nhóm có lịch học cố định tại trung tâm Sportigo.'}</p>
                </div>
              </div>
              <dl className="registration-confirm__details">
                <div><dt><UserCircle aria-hidden="true" /> Coach</dt><dd>{item.coach.user.displayName}</dd></div>
                <div><dt><CalendarBlank aria-hidden="true" /> Thời gian khóa</dt><dd>{formatDate(item.startDate)} – {formatDate(item.endDate)}</dd></div>
                <div><dt><UsersThree aria-hidden="true" /> Chỗ còn lại</dt><dd>{item.remainingSeats} / {item.capacity} học viên</dd></div>
                <div><dt><CurrencyCircleDollar aria-hidden="true" /> Học phí</dt><dd className="registration-confirm__price">{money(item.tuitionFee)}</dd></div>
              </dl>
              <div className="registration-confirm__deadline">
                <CalendarBlank aria-hidden="true" />
                <div><span>Hạn đăng ký</span><strong>{formatDateTime(item.registrationCloseAt)}</strong></div>
              </div>
              <div className="registration-confirm__notice">
                <ShieldCheck weight="fill" aria-hidden="true" />
                <div><strong>Chưa phát sinh thanh toán ở bước này</strong><p>Sau khi xác nhận, hệ thống tạo đơn chờ thanh toán. Chỗ học chỉ được xác nhận khi thanh toán thành công trước thời hạn giữ chỗ.</p></div>
              </div>
            </div>
          )}
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
        description={<p>Hủy đăng ký #{cancelTarget?.registrationId}. {activeRegistration?.status === 'PENDING_PAYMENT' ? 'Đơn chưa thanh toán sẽ được hủy và không phát sinh hoàn tiền.' : hoursUntilFirstSession >= 48 ? 'Bạn được hoàn 100% tiền đã thanh toán vào ví.' : 'Bạn đang hủy trong 48 giờ trước buổi đầu: hoàn 50% vào ví và mất 50% học phí.'}</p>}
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
