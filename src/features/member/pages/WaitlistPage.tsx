import { Clock, MagnifyingGlass, UsersThree } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../../components/ui/Button';
import { Card, SectionHeading } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { ConfirmDialog, Dialog } from '../../../components/ui/Dialog';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton } from '../../../components/ui/States';
import { Tabs } from '../../../components/ui/Tabs';
import { addDays, formatDate, formatDateTime, formatTime, toCenterDate, weekRange } from '../../training/format';
import { parseApiError } from '../../training/errors';
import { isClassBookable } from '../bookingEligibility';
import { getPublicClass, getWaitlists } from '../bookingApi';
import {
  useJoinClassWaitlist,
  useManagerWaitlists,
  useMyWaitlists,
  usePublicClasses,
  useRespondToClassWaitlist,
  useWaitlistHistory,
} from '../bookingHooks';
import type {
  PublicClassDetail,
  WaitlistEntry,
  WaitlistFilters,
  WaitlistInvitation,
  WaitlistInvitationStatus,
  WaitlistRecord,
} from '../bookingTypes';
import { useGroupClasses } from '../../group-classes/hooks/useGroupClasses';
import { useQuery } from '@tanstack/react-query';

const PAGE_SIZE = 10;
const CLASS_PAGE_SIZE = 10;
const MANAGER_API_PAGE_SIZE = 100;
const EMPTY_WAITLIST_RECORDS: WaitlistRecord[] = [];

const memberTabs = [
  { value: 'classes', label: 'Lớp có thể tham gia' },
  { value: 'invitations', label: 'Lời mời của tôi' },
  { value: 'history', label: 'Lịch sử' },
] as const;

const managerTabs = [
  { value: 'overview', label: 'Tổng quan' },
  { value: 'waitlists', label: 'Danh sách chờ' },
  { value: 'invitations', label: 'Quản lý lời mời' },
  { value: 'history', label: 'Lịch sử' },
] as const;

type MemberTab = (typeof memberTabs)[number]['value'];
type ManagerTab = (typeof managerTabs)[number]['value'];
type WaitlistStatus = WaitlistEntry['status'];
type InvitationStatusFilter = WaitlistInvitationStatus | '';

const waitlistStatuses: WaitlistStatus[] = ['WAITING', 'OFFERED', 'ACCEPTED', 'CANCELLED', 'EXPIRED'];
const invitationStatuses: WaitlistInvitationStatus[] = [
  'OFFERED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'FULFILLED',
];

const statusNames: Record<string, string> = {
  WAITING: 'Đang chờ',
  OFFERED: 'Đã mời',
  ACCEPTED: 'Đã nhận lời',
  DECLINED: 'Đã từ chối',
  CANCELLED: 'Đã rời hàng chờ',
  EXPIRED: 'Hết hạn',
  PAYMENT_FAILED: 'Thanh toán thất bại',
  PAYMENT_EXPIRED: 'Đơn thanh toán hết hạn',
  FULFILLED: 'Hoàn tất',
};

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'WAITING' || status === 'OFFERED') return 'warning';
  if (status === 'FULFILLED' || status === 'ACCEPTED') return 'success';
  if (status === 'DECLINED' || status === 'CANCELLED' || status === 'EXPIRED' || status.includes('FAILED')) return 'danger';
  return 'neutral';
}

function StatusBadge({ status }: { status: string }) {
  return <Chip tone={statusTone(status)} dot>{statusNames[status] ?? status}</Chip>;
}

async function getAllManagerWaitlists(filters: Omit<WaitlistFilters, 'page' | 'limit'> = {}) {
  const firstPage = await getWaitlists({ ...filters, page: 1, limit: MANAGER_API_PAGE_SIZE });
  const totalPages = Math.ceil(firstPage.total / firstPage.limit);
  const items = [...firstPage.items];
  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await getWaitlists({ ...filters, page, limit: MANAGER_API_PAGE_SIZE });
    items.push(...nextPage.items);
  }
  return {
    items,
    total: firstPage.total,
  };
}

function waitlistRank(records: WaitlistRecord[], id: number, page: number, limit: number) {
  const rowIndex = records.findIndex((record) => record.id === id);
  return rowIndex < 0 ? null : (page - 1) * limit + rowIndex + 1;
}

export function WaitlistPage() {
  const role = getSessionRole();
  if (role === 'MEMBER') return <MemberWaitlistView />;
  if (role === 'CENTER_MANAGER') return <ManagerWaitlistView />;
  return <ErrorState error={new Error('Vai trò này không được phép xem Waitlist.')} />;
}

function MemberWaitlistView() {
  const [tab, setTab] = useState<MemberTab>('classes');
  const [classPage, setClassPage] = useState(1);
  const [responseTarget, setResponseTarget] = useState<{ classId: number; accept: boolean; className: string } | null>(null);
  const navigate = useNavigate();
  const waitlists = useMyWaitlists();
  const classes = usePublicClasses({ page: classPage, limit: CLASS_PAGE_SIZE });
  const classDetails = useQuery({
    queryKey: ['waitlist', 'class-details', classPage, classes.data?.data.map((item) => item.id)],
    queryFn: async () => Promise.all((classes.data?.data ?? []).map(({ id }) => getPublicClass(id))),
    enabled: Boolean(classes.data),
    retry: false,
  });
  const respond = useRespondToClassWaitlist();
  const [actionError, setActionError] = useState('');
  const activeWaitlistIds = new Set(
    (waitlists.data ?? [])
      .filter((entry) => entry.status === 'WAITING' || entry.status === 'OFFERED')
      .map((entry) => entry.classId),
  );
  const offeredInvitations = (waitlists.data ?? []).flatMap((entry) =>
    entry.invitations
      .filter((invitation) => invitation.status === 'OFFERED')
      .map((invitation) => ({ entry, invitation })),
  );
  const historicalRecords = (waitlists.data ?? []).filter((entry) =>
    entry.status !== 'WAITING' && entry.status !== 'OFFERED' ||
    entry.invitations.some((invitation) => invitation.status !== 'OFFERED'),
  );
  const bookableFullClasses = (classDetails.data ?? []).filter(
    (item) => item.remainingSeats <= 0 && isClassBookable(item),
  );
  const pageCount = classes.data?.pagination.totalPages ?? 1;

  const submitResponse = async () => {
    if (!responseTarget || respond.isPending) return;
    setActionError('');
    try {
      const result = await respond.mutateAsync({
        classId: responseTarget.classId,
        accept: responseTarget.accept,
      });
      setResponseTarget(null);
      if (result.order) {
        navigate(`/member/payments?orderId=${result.order.id}`);
      } else if (responseTarget.accept) {
        setActionError('Backend chưa trả đơn thanh toán cho lời mời này. Vui lòng tải lại danh sách để kiểm tra trạng thái.');
      }
    } catch {
      // The API error is shown inside the confirmation dialog.
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6">
      <Link to="/member/my-schedule" className="inline-flex items-center text-sm font-bold text-primary-deep hover:underline">← Lịch học của tôi</Link>
      <header className="rounded-card bg-primary-deep px-5 py-7 text-white sm:px-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Danh sách chờ & lời mời</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
          Theo dõi lớp đã kín chỗ, vị trí chờ do hệ thống xử lý và phản hồi lời mời vào lớp.
        </p>
      </header>

      <Tabs<MemberTab> label="Các chức năng Waitlist của hội viên" idPrefix="member-waitlist" tabs={memberTabs} value={tab} onChange={setTab} />
      {actionError && <InlineAlert>{actionError}</InlineAlert>}

      <section role="tabpanel" id={`member-waitlist-panel-${tab}`} aria-labelledby={`member-waitlist-tab-${tab}`}>
        {tab === 'classes' && (
          <div className="space-y-4">
            <SectionHeading title="Lớp đang đầy và còn mở đăng ký" description="Thông tin lớp và số chỗ được lấy trực tiếp từ API booking." />
            {waitlists.isError ? <ErrorState error={waitlists.error} onRetry={() => waitlists.refetch()} retrying={waitlists.isRefetching} pendingApi="GET /api/waitlist/me" /> :
              waitlists.isPending || classes.isPending || classDetails.isPending ? <ListSkeleton label="Đang tải lớp và danh sách chờ…" /> :
                classes.isError ? <ErrorState error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isRefetching} pendingApi="GET /api/bookings/classes" /> :
                  classDetails.isError ? <ErrorState error={classDetails.error} onRetry={() => classDetails.refetch()} retrying={classDetails.isRefetching} pendingApi="GET /api/bookings/classes/:id" /> :
                    bookableFullClasses.length === 0 ? <EmptyState title="Chưa có lớp phù hợp" description="Hiện không có lớp nào vừa hết chỗ vừa còn trong thời hạn đăng ký." /> :
                      <div className="grid gap-4">
                        {bookableFullClasses.map((item) => (
                          <MemberWaitlistClassCard
                            key={item.id}
                            item={item}
                            alreadyWaiting={activeWaitlistIds.has(item.id)}
                            canCheckDuplicates={!waitlists.isError && !waitlists.isPending}
                          />
                        ))}
                      </div>}
            {!classes.isPending && !classes.isError && pageCount > 1 && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted">Trang {classPage}/{pageCount}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={classPage <= 1} onClick={() => setClassPage((page) => Math.max(1, page - 1))}>Trước</Button>
                  <Button variant="secondary" disabled={classPage >= pageCount} onClick={() => setClassPage((page) => Math.min(pageCount, page + 1))}>Sau</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'invitations' && (
          <div className="space-y-4">
            <SectionHeading title="Lời mời đang chờ phản hồi" description="Nhận lời sẽ tạo đơn chờ thanh toán; lời mời chỉ hoàn tất sau khi Backend xác nhận thanh toán." />
            {waitlists.isPending ? <ListSkeleton label="Đang tải lời mời…" /> :
              waitlists.isError ? <ErrorState error={waitlists.error} onRetry={() => waitlists.refetch()} retrying={waitlists.isRefetching} pendingApi="GET /api/waitlist/me" /> :
                offeredInvitations.length === 0 ? <EmptyState title="Chưa có lời mời mới" description="Các lời mời sẽ xuất hiện ở đây khi hệ thống chuyển chỗ trống theo thứ tự." /> :
                  <div className="grid gap-3">
                    {offeredInvitations.map(({ entry, invitation }) => (
                      <Card key={invitation.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h2 className="font-extrabold">{entry.groupClass.name}</h2>
                          <p className="mt-1 text-sm text-muted">Được mời: {formatDateTime(invitation.offeredAt)}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Clock aria-hidden="true" /> Hạn phản hồi: {formatDateTime(invitation.expiresAt)}</p>
                          <div className="mt-2"><StatusBadge status={invitation.status} /></div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button disabled={respond.isPending} onClick={() => { respond.reset(); setResponseTarget({ classId: entry.classId, accept: true, className: entry.groupClass.name }); }}>ACCEPT</Button>
                          <Button variant="secondary" disabled={respond.isPending} onClick={() => { respond.reset(); setResponseTarget({ classId: entry.classId, accept: false, className: entry.groupClass.name }); }}>DECLINE</Button>
                        </div>
                      </Card>
                    ))}
                  </div>}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-4">
            <SectionHeading title="Lịch sử Waitlist" description="Lịch sử lời mời do Backend trả về, bao gồm cả trạng thái thanh toán." />
            <MemberWaitlistList entries={historicalRecords} query={waitlists} emptyTitle="Chưa có lịch sử" />
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(responseTarget)}
        title={responseTarget?.accept ? 'Xác nhận nhận lời mời' : 'Xác nhận từ chối lời mời'}
        description={responseTarget?.accept
          ? <>Nhận lời mời vào lớp <strong>{responseTarget.className}</strong> sẽ tạo đơn chờ thanh toán và chuyển bạn tới trang thanh toán.</>
          : <>Bạn có chắc muốn từ chối lời mời vào lớp <strong>{responseTarget?.className}</strong>?</>}
        confirmLabel={responseTarget?.accept ? 'Nhận lời' : 'Từ chối lời mời'}
        tone={responseTarget?.accept ? 'primary' : 'danger'}
        loading={respond.isPending}
        onConfirm={() => void submitResponse()}
        onCancel={() => { if (!respond.isPending) { setResponseTarget(null); respond.reset(); } }}
        error={respond.isError ? <InlineAlert>{parseApiError(respond.error).message}</InlineAlert> : undefined}
      />
    </div>
  );
}

function MemberWaitlistClassCard({
  item,
  alreadyWaiting,
  canCheckDuplicates,
}: {
  item: PublicClassDetail;
  alreadyWaiting: boolean;
  canCheckDuplicates: boolean;
}) {
  const join = useJoinClassWaitlist(item.id);
  const coachName = item.coach.user.displayName;
  const occupied = item.capacity - item.remainingSeats;
  const pendingPaymentSeats = Math.max(0, occupied - item.confirmedCount);
  const [message, setMessage] = useState('');

  const handleJoin = async () => {
    if (join.isPending || alreadyWaiting || !canCheckDuplicates) return;
    setMessage('');
    try {
      await join.mutateAsync();
      setMessage('Đã tham gia danh sách chờ.');
    } catch (error) {
      setMessage(parseApiError(error).message);
    }
  };

  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{item.sport.name}</p>
          <h2 className="mt-1 text-lg font-extrabold">{item.name}</h2>
        </div>
        <Chip tone="danger" dot>Đã hết chỗ</Chip>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Huấn luyện viên</dt><dd className="font-bold">{coachName}</dd></div>
        <div>
          <dt className="text-muted">Đã xác nhận / sức chứa</dt>
          <dd className="font-bold">{item.confirmedCount} / {item.capacity}</dd>
          {pendingPaymentSeats > 0 && <dd className="text-xs text-muted">{pendingPaymentSeats} chỗ đang chờ thanh toán</dd>}
        </div>
      </dl>
      <ClassWaitlistTimetable sessions={item.sessions} />
      {message && <p role={message === 'Đã tham gia danh sách chờ.' ? 'status' : 'alert'} className={`text-sm ${message === 'Đã tham gia danh sách chờ.' ? 'text-success' : 'text-danger'}`}>{message}</p>}
      {!canCheckDuplicates && <p role="alert" className="text-sm text-danger">Không thể kiểm tra danh sách chờ hiện tại. Hãy tải lại trước khi tham gia.</p>}
      <div className="mt-auto">
        <Button className="w-full" loading={join.isPending} disabled={alreadyWaiting || !canCheckDuplicates} onClick={() => void handleJoin()}>
          {alreadyWaiting ? 'Đã có trong danh sách chờ' : 'Join Waitlist'}
        </Button>
      </div>
    </Card>
  );
}

function ClassWaitlistTimetable({ sessions }: { sessions: PublicClassDetail['sessions'] }) {
  const [page, setPage] = useState(0);
  const active = sessions.filter((session) => session.status !== 'CANCELLED').sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (!active.length) return <p className="text-sm text-muted">Chưa có lịch buổi học.</p>;
  const firstWeek = weekRange(toCenterDate(new Date(active[0].startsAt))).from;
  const lastWeek = weekRange(toCenterDate(new Date(active.at(-1)!.startsAt))).from;
  const totalWeeks = Math.floor((Date.parse(`${lastWeek}T00:00:00Z`) - Date.parse(`${firstWeek}T00:00:00Z`)) / 604800000) + 1;
  const maxPage = Math.max(0, Math.ceil(totalWeeks / 4) - 1);
  const shownPage = Math.min(page, maxPage);
  const weeks = Array.from({ length: Math.min(4, totalWeeks - shownPage * 4) }, (_, index) => addDays(firstWeek, (shownPage * 4 + index) * 7));
  return <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-ink">Thời khóa biểu · {active.length} buổi</h3><div className="flex items-center gap-2 text-xs"><button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} aria-label="4 tuần trước">←</button><span>{shownPage + 1}/{maxPage + 1}</span><button type="button" className="rounded-lg border border-line px-2 py-1 disabled:opacity-40" disabled={shownPage === maxPage} onClick={() => setPage(shownPage + 1)} aria-label="4 tuần sau">→</button></div></div><div className="overflow-x-auto rounded-xl border border-line" role="region" aria-label="Thời khóa biểu lớp" tabIndex={0}><table className="w-full min-w-[680px] table-fixed border-collapse text-xs"><thead><tr className="bg-canvas text-ink"><th className="w-20 border-b border-r border-line p-2 text-left">Tuần</th>{['T2','T3','T4','T5','T6','T7','CN'].map((day) => <th className="border-b border-r border-line p-2" key={day}>{day}</th>)}</tr></thead><tbody>{weeks.map((week, index) => <tr key={week}><th className="border-b border-r border-line bg-canvas p-2 text-left text-primary-deep">Tuần {shownPage * 4 + index + 1}<small className="mt-1 block font-normal text-muted">{formatDate(week)}</small></th>{Array.from({ length: 7 }, (_, dayIndex) => { const date = addDays(week, dayIndex); const daySessions = active.filter((session) => toCenterDate(new Date(session.startsAt)) === date); return <td className="h-16 border-b border-r border-line p-1.5 align-top" key={date}>{daySessions.map((session) => <div key={session.id} className="rounded-lg bg-primary/10 p-1.5 font-semibold text-primary-deep"><span className="block">{formatTime(session.startsAt)}–{formatTime(session.endsAt)}</span><span className="block text-[10px] font-normal">{formatDate(session.startsAt)}</span></div>)}</td>; })}</tr>)}</tbody></table></div></div>;
}

function MemberWaitlistList({
  entries,
  query,
  emptyTitle = 'Bạn chưa tham gia Waitlist nào',
}: {
  entries: WaitlistRecord[];
  query: ReturnType<typeof useMyWaitlists>;
  emptyTitle?: string;
}) {
  if (query.isPending) return <ListSkeleton label="Đang tải danh sách chờ…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isRefetching} pendingApi="GET /api/waitlist/me" />;
  if (entries.length === 0) return <EmptyState icon={<UsersThree />} title={emptyTitle} description="Các bản ghi sẽ xuất hiện khi bạn tham gia lớp hoặc nhận lời mời." />;

  return (
    <div className="space-y-3">
      <SectionHeading title="Waitlist của tôi" description="Vị trí xếp hàng không được API Member trả về; bảng không tự suy diễn thứ tự." />
      {entries.map((entry) => (
        <Card key={entry.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <h2 className="font-extrabold">{entry.groupClass.name}</h2>
            <p className="mt-1 text-sm text-muted">Tham gia: {formatDateTime(entry.joinedAt)}</p>
            <p className="mt-1 text-sm text-muted">Thứ tự chờ: API chưa trả về</p>
            {entry.invitations.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                Lời mời gần nhất: <StatusBadge status={entry.invitations[0].status} />
              </p>
            )}
          </div>
          <StatusBadge status={entry.status} />
        </Card>
      ))}
    </div>
  );
}

function ManagerWaitlistView() {
  const [tab, setTab] = useState<ManagerTab>('overview');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistStatus | ''>('');
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatusFilter>('');
  const [page, setPage] = useState(1);
  const [historyTarget, setHistoryTarget] = useState<WaitlistRecord | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const classId = classFilter ? Number(classFilter) : undefined;
  const needsAllRows = tab === 'invitations' || tab === 'history' || (tab === 'waitlists' && Boolean(normalizedSearch));
  const pageFilters: WaitlistFilters = {
    page,
    limit: PAGE_SIZE,
    ...(classId ? { classId } : {}),
    ...(tab === 'waitlists' && waitlistStatus ? { status: waitlistStatus } : {}),
  };
  const listQuery = useManagerWaitlists(pageFilters, !needsAllRows);
  const allRowsQuery = useQuery({
    queryKey: ['waitlist', 'manager-all', classId, tab === 'waitlists' ? waitlistStatus : ''],
    queryFn: () => getAllManagerWaitlists({
      ...(classId ? { classId } : {}),
      ...(tab === 'waitlists' && waitlistStatus ? { status: waitlistStatus } : {}),
    }),
    enabled: needsAllRows,
    retry: false,
  });
  const rows = needsAllRows
    ? allRowsQuery.data?.items ?? EMPTY_WAITLIST_RECORDS
    : listQuery.data?.items ?? EMPTY_WAITLIST_RECORDS;
  const query = needsAllRows ? allRowsQuery : listQuery;
  const managerRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((entry) =>
      `${entry.member?.user.displayName ?? ''} ${entry.memberId} ${entry.groupClass.name}`
        .toLocaleLowerCase('vi')
        .includes(normalizedSearch),
    );
  }, [normalizedSearch, rows]);
  const currentListRecords = tab === 'waitlists' && needsAllRows
    ? managerRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : managerRows;
  const flattenedInvitations = useMemo(() => rows.flatMap((entry) =>
    entry.invitations.map((invitation) => ({ entry, invitation })),
  ).filter(({ entry, invitation }) =>
    (!invitationStatus || invitation.status === invitationStatus) &&
    (!normalizedSearch || `${entry.member?.user.displayName ?? ''} ${entry.memberId} ${entry.groupClass.name}`.toLocaleLowerCase('vi').includes(normalizedSearch)),
  ), [invitationStatus, normalizedSearch, rows]);
  const invitationPageItems = flattenedInvitations.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleHistory = managerRows.filter((entry) => entry.invitations.length > 0);
  const historyPageItems = visibleHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalRows = needsAllRows ? managerRows.length : listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const invitePages = Math.max(1, Math.ceil(flattenedInvitations.length / PAGE_SIZE));
  const historyPages = Math.max(1, Math.ceil(visibleHistory.length / PAGE_SIZE));
  const groupClasses = useGroupClasses();
  const history = useWaitlistHistory(historyTarget?.id ?? null);
  const summary = useQuery({
    queryKey: ['waitlist', 'manager-summary'],
    queryFn: async () => {
      const [waiting, invited, expired, accepted] = await Promise.all([
        getWaitlists({ page: 1, limit: 1, status: 'WAITING' }),
        getWaitlists({ page: 1, limit: 1, status: 'OFFERED' }),
        getWaitlists({ page: 1, limit: 1, status: 'EXPIRED' }),
        getAllManagerWaitlists({ status: 'ACCEPTED' }),
      ]);
      return {
        waiting: waiting.total,
        invited: invited.total,
        expired: expired.total,
        completed: accepted.items.reduce((total, entry) =>
          total + entry.invitations.filter((invitation) => invitation.status === 'FULFILLED').length, 0,
        ),
      };
    },
    retry: false,
  });

  const setTabAndReset = (next: ManagerTab) => {
    setPage(1);
    setTab(next);
  };

  const handleFilterChange = (update: () => void) => {
    update();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="rounded-card bg-primary-deep px-5 py-7 text-white sm:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[.16em] text-white/70">CENTER MANAGER · FR-26</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Quản lý Waitlist</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Theo dõi danh sách chờ và vòng đời lời mời. Trang này không xác nhận booking hoặc payment thay Member.</p>
      </header>

      <Tabs<ManagerTab> label="Các chức năng quản lý Waitlist" idPrefix="manager-waitlist" tabs={managerTabs} value={tab} onChange={setTabAndReset} />
      {tab !== 'overview' && (
        <div className="grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold text-ink">
            Tìm Member hoặc lớp
            <span className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input className="w-full rounded-control border border-line bg-surface py-2.5 pl-10 pr-3 font-medium" value={search} onChange={(event) => handleFilterChange(() => setSearch(event.target.value))} placeholder="Tên, Member ID hoặc lớp" />
            </span>
          </label>
          <label className="grid gap-1 text-sm font-bold text-ink">
            Lớp
            <select className="rounded-control border border-line bg-surface px-3 py-2.5 font-medium" value={classFilter} onChange={(event) => handleFilterChange(() => setClassFilter(event.target.value))} disabled={groupClasses.isPending || groupClasses.isError}>
              <option value="">Tất cả lớp</option>
              {groupClasses.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          {tab === 'waitlists' ? (
            <label className="grid gap-1 text-sm font-bold text-ink">
              Trạng thái Waitlist
              <select className="rounded-control border border-line bg-surface px-3 py-2.5 font-medium" value={waitlistStatus} onChange={(event) => handleFilterChange(() => setWaitlistStatus(event.target.value as WaitlistStatus | ''))}>
                <option value="">Tất cả trạng thái</option>
                {waitlistStatuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}
              </select>
            </label>
          ) : tab === 'invitations' ? (
            <label className="grid gap-1 text-sm font-bold text-ink">
              Trạng thái lời mời
              <select className="rounded-control border border-line bg-surface px-3 py-2.5 font-medium" value={invitationStatus} onChange={(event) => handleFilterChange(() => setInvitationStatus(event.target.value as InvitationStatusFilter))}>
                <option value="">Tất cả trạng thái</option>
                {invitationStatuses.map((status) => <option key={status} value={status}>{statusNames[status]}</option>)}
              </select>
            </label>
          ) : <div className="self-end text-sm text-muted">Lọc theo lịch sử lời mời đã lưu.</div>}
          {groupClasses.isError && <div className="md:col-span-3"><InlineAlert>Không tải được danh sách lớp: {parseApiError(groupClasses.error).message}</InlineAlert></div>}
        </div>
      )}

      <section role="tabpanel" id={`manager-waitlist-panel-${tab}`} aria-labelledby={`manager-waitlist-tab-${tab}`}>
        {tab === 'overview' && (
          <div className="space-y-4">
            <SectionHeading title="Tổng quan hàng chờ" description="Thống kê được tổng hợp từ các bản ghi Waitlist và invitation Backend trả về." />
            {summary.isPending ? <ListSkeleton rows={2} label="Đang tải thống kê Waitlist…" /> :
              summary.isError ? <ErrorState error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isRefetching} pendingApi="GET /api/waitlist" /> :
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard label="WAITING" value={summary.data.waiting} tone="warning" />
                  <SummaryCard label="INVITED" value={summary.data.invited} tone="primary" />
                  <SummaryCard label="EXPIRED" value={summary.data.expired} tone="danger" />
                  <SummaryCard label="COMPLETED" value={summary.data.completed} tone="success" />
                </div>}
          </div>
        )}

        {tab === 'waitlists' && (
          <ManagerDataState query={query} pendingApi="GET /api/waitlist">
            {currentListRecords.length === 0 ? <EmptyState title="Không có bản ghi Waitlist" description="Thử bỏ bớt bộ lọc hoặc tìm kiếm khác." /> :
              <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="manager-table w-full min-w-[820px]">
                  <thead><tr><th>Member ID</th><th>Member</th><th>Lớp</th><th>Tham gia</th><th>Thứ tự chờ</th><th>Trạng thái</th></tr></thead>
                  <tbody>{currentListRecords.map((entry) => {
                    const rank = classId && waitlistStatus === 'WAITING' && !normalizedSearch
                      ? waitlistRank(currentListRecords, entry.id, page, PAGE_SIZE)
                      : null;
                    return <tr key={entry.id}>
                      <td>{entry.memberId}</td>
                      <td>{entry.member?.user.displayName ?? '—'}</td>
                      <td>{entry.groupClass.name}</td>
                      <td>{formatDateTime(entry.joinedAt)}</td>
                      <td>{rank ?? '—'}</td>
                      <td><StatusBadge status={entry.status} /></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>}
            {classId && waitlistStatus === 'WAITING' && <p className="text-xs text-muted">Thứ tự được tính từ danh sách WAITING đã phân trang theo thứ tự FIFO của API.</p>}
            {pagination(page, totalPages, setPage, totalRows)}
          </ManagerDataState>
        )}

        {tab === 'invitations' && (
          <ManagerDataState query={query} pendingApi="GET /api/waitlist">
            {invitationPageItems.length === 0 ? <EmptyState title="Không có lời mời phù hợp" description="Lời mời và các trạng thái lịch sử được đọc từ bản ghi Waitlist." /> :
              <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="manager-table w-full min-w-[780px]">
                  <thead><tr><th>Member</th><th>Lớp</th><th>Thời điểm mời</th><th>Hạn phản hồi</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>{invitationPageItems.map(({ entry, invitation }) => (
                    <tr key={invitation.id}>
                      <td>{entry.member?.user.displayName ?? `Member #${entry.memberId}`}</td>
                      <td>{entry.groupClass.name}</td>
                      <td>{formatDateTime(invitation.offeredAt)}</td>
                      <td>{formatDateTime(invitation.expiresAt)}</td>
                      <td><StatusBadge status={invitation.status} /></td>
                      <td><Button variant="secondary" size="sm" onClick={() => setHistoryTarget(entry)}>Lịch sử</Button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
            {pagination(page, invitePages, setPage, flattenedInvitations.length)}
          </ManagerDataState>
        )}

        {tab === 'history' && (
          <ManagerDataState query={query} pendingApi="GET /api/waitlist">
            {historyPageItems.length === 0 ? <EmptyState title="Chưa có lịch sử lời mời" description="Lịch sử sẽ xuất hiện sau khi hệ thống gửi invitation." /> :
              <div className="overflow-x-auto rounded-card border border-line bg-surface">
                <table className="manager-table w-full min-w-[700px]">
                  <thead><tr><th>Member</th><th>Lớp</th><th>Tham gia</th><th>Lời mời</th><th>Trạng thái Waitlist</th><th></th></tr></thead>
                  <tbody>{historyPageItems.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.member?.user.displayName ?? `Member #${entry.memberId}`}</td>
                      <td>{entry.groupClass.name}</td>
                      <td>{formatDateTime(entry.joinedAt)}</td>
                      <td>{entry.invitations.length}</td>
                      <td><StatusBadge status={entry.status} /></td>
                      <td><Button variant="secondary" size="sm" onClick={() => setHistoryTarget(entry)}>Xem lịch sử</Button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>}
            {pagination(page, historyPages, setPage, visibleHistory.length)}
          </ManagerDataState>
        )}
      </section>

      <Dialog
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title="Lịch sử Invitation"
        description={historyTarget ? `${historyTarget.member?.user.displayName ?? `Member #${historyTarget.memberId}`} · ${historyTarget.groupClass.name}` : undefined}
        size="md"
      >
        {history.isPending ? <ListSkeleton label="Đang tải lịch sử invitation…" /> :
          history.isError ? <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isRefetching} pendingApi="GET /api/waitlist/:id/history" /> :
            <InvitationHistory invitations={history.data?.invitations ?? []} />}
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'danger' | 'primary' }) {
  const styles = {
    success: 'border-accent-lime/50 bg-accent-lime/10',
    warning: 'border-accent-energy/45 bg-accent-energy/10',
    danger: 'border-danger/25 bg-danger/5',
    primary: 'border-primary/20 bg-primary/5',
  };
  return <Card className={`p-5 ${styles[tone]}`}><p className="text-xs font-extrabold uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-3xl font-extrabold text-ink">{value}</p></Card>;
}

function ManagerDataState({
  query,
  pendingApi,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; isRefetching: boolean; refetch: () => unknown };
  pendingApi: string;
  children: React.ReactNode;
}) {
  if (query.isPending) return <ListSkeleton label="Đang tải dữ liệu Waitlist…" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isRefetching} pendingApi={pendingApi} />;
  return <div className="space-y-3">{children}</div>;
}

function InvitationHistory({ invitations }: { invitations: WaitlistInvitation[] }) {
  if (invitations.length === 0) return <EmptyState compact title="Chưa có invitation" description="Waitlist chưa có lời mời được ghi nhận." />;
  return (
    <ol className="space-y-3">
      {invitations.map((invitation) => (
        <li key={invitation.id} className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={invitation.status} />
            <span className="text-xs text-muted">{formatDateTime(invitation.offeredAt)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">Hạn phản hồi: {formatDateTime(invitation.expiresAt)}</p>
          {invitation.respondedAt && <p className="mt-1 text-sm text-muted">Đã phản hồi: {formatDateTime(invitation.respondedAt)}</p>}
          {invitation.order && <p className="mt-1 text-sm text-muted">Đơn {invitation.order.orderNumber} · {invitation.order.status}</p>}
        </li>
      ))}
    </ol>
  );
}

function pagination(page: number, totalPages: number, setPage: (page: number) => void, total: number) {
  if (total === 0 || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{total} kết quả · Trang {page}/{totalPages}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</Button>
      </div>
    </div>
  );
}
