import { ArrowRight, CalendarCheck } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AttendanceHistoryPanel } from '../components/AttendanceHistoryPanel';
import { Card, PageHeader } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/States';
import { tabPanelProps } from '../../../components/ui/styles';
import { Tabs } from '../../../components/ui/Tabs';
import { addDays, endOfCenterDay, formatDate, formatTime, startOfCenterDay, todayInCenter } from '../format';
import { useCoachSessions } from '../hooks/usePendingApis';

const TAB_PREFIX = 'coach-attendance';
const coachTabs = [
  { value: 'sessions', label: 'Buổi dạy cần điểm danh' },
  { value: 'history', label: 'Lịch sử điểm danh' },
] as const;
type CoachTab = (typeof coachTabs)[number]['value'];
const HISTORY_FILTERS = ['from', 'to', 'status', 'classId', 'page'];

// FR-48 · /coach/attendance và /manager/attendance
export function AttendanceHistoryPage({ scope }: { scope: 'coach' | 'manager' }) {
  const [params, setParams] = useSearchParams();
  // Tab lưu trên URL; link có sẵn bộ lọc lịch sử thì mở thẳng tab Lịch sử
  const tab: CoachTab =
    params.get('tab') === 'history' || (params.get('tab') !== 'sessions' && HISTORY_FILTERS.some((key) => params.get(key)))
      ? 'history'
      : 'sessions';
  // Ghi tab vào URL để bấm "Xóa bộ lọc" không làm trang nhảy về tab Buổi dạy
  const tabInUrl = params.get('tab');
  useEffect(() => {
    if (scope === 'coach' && tab === 'history' && tabInUrl !== 'history') {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', 'history');
        return next;
      }, { replace: true });
    }
  }, [scope, tab, tabInUrl, setParams]);

  const changeTab = (value: CoachTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Điểm danh"
        title={scope === 'coach' ? 'Điểm danh' : 'Lịch sử điểm danh'}
        description={
          scope === 'coach' ? (
            <span className="lg:whitespace-nowrap">
              Điểm danh các buổi lớp bạn phụ trách và tra cứu lịch sử. Bấm vào thời gian buổi học để mở lại màn điểm danh.
            </span>
          ) : (
            'Tra cứu điểm danh của toàn trung tâm theo thời gian, trạng thái, lớp và học viên.'
          )
        }
      />
      {scope === 'coach' ? (
        <>
          <Tabs label="Điểm danh" idPrefix={TAB_PREFIX} tabs={coachTabs} value={tab} onChange={changeTab} />
          <div {...tabPanelProps(TAB_PREFIX, tab)} className="mt-5 focus-visible:outline-none">
            {tab === 'sessions' ? (
              <CoachSessionsToday />
            ) : (
              <section aria-label="Lịch sử điểm danh">
                <AttendanceHistoryPanel scope="coach" />
              </section>
            )}
          </div>
        </>
      ) : (
        <section aria-labelledby="attendance-history-heading">
          <h2 id="attendance-history-heading" className="sr-only">
            Lịch sử điểm danh
          </h2>
          <AttendanceHistoryPanel scope="manager" />
        </section>
      )}
    </div>
  );
}

/** Buổi dạy hôm qua và hôm nay của Coach: lối vào chính của màn điểm danh (FR-47) */
function CoachSessionsToday() {
  const today = todayInCenter();
  const sessions = useCoachSessions({ from: startOfCenterDay(addDays(today, -1)), to: endOfCenterDay(today) });

  return (
    <section aria-label="Buổi dạy cần điểm danh">
      {/* Có danh sách: hàng tự có khoảng đệm để vùng hover phủ kín thẻ (overflow-hidden cắt theo góc bo) */}
      <Card className={sessions.data?.length ? 'overflow-hidden' : 'p-5 sm:p-6'}>
        {sessions.isPending ? (
          <div className="space-y-2" role="status">
            <span className="sr-only">Đang tải buổi dạy…</span>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : sessions.isError ? (
          <ErrorState
            compact
            error={sessions.error}
            onRetry={() => sessions.refetch()}
            retrying={sessions.isRefetching}
            pendingApi="GET /api/coaches/me/members, /api/group-classes/:id/sessions"
          />
        ) : sessions.data.length === 0 ? (
          <EmptyState compact icon={<CalendarCheck />} title="Không có buổi dạy" description="Bạn không có buổi lớp nhóm nào hôm qua và hôm nay." />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.data.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/coach/sessions/${session.id}/attendance`}
                  className="group flex min-h-16 items-center gap-3 px-5 py-4 transition-colors sm:px-6 duration-200 hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
                >
                  <div className="w-24 shrink-0 text-sm">
                    <p className="font-extrabold text-ink">{formatTime(session.startsAt)}</p>
                    <p className="text-xs text-muted">{formatDate(session.startsAt)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{session.class.name}</p>
                    <p className="text-xs text-muted">
                      {session.class.sport.name}
                      {session.room && ` · ${session.room.name}`} · {session.markedCount}/{session.confirmedCount} đã điểm danh
                    </p>
                  </div>
                  {session.isLocked ? <Chip tone="neutral">Đã khóa</Chip> : <Chip tone="success" dot>Đang mở</Chip>}
                  <ArrowRight
                    className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
