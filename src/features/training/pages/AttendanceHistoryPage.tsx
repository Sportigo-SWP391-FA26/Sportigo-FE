import { ArrowRight, CalendarCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { AttendanceHistoryPanel } from '../components/AttendanceHistoryPanel';
import { Card, PageHeader, SectionHeading } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { EmptyState, ErrorState, Skeleton } from '../components/ui/States';
import { addDays, endOfCenterDay, formatDate, formatTime, startOfCenterDay, todayInCenter } from '../format';
import { useCoachSessions } from '../hooks/usePendingApis';

// FR-48 · /coach/attendance và /manager/attendance
export function AttendanceHistoryPage({ scope }: { scope: 'coach' | 'manager' }) {
  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Điểm danh"
        title={scope === 'coach' ? 'Điểm danh' : 'Lịch sử điểm danh'}
        description={
          scope === 'coach'
            ? 'Điểm danh các buổi lớp bạn phụ trách và tra cứu lịch sử. Bấm vào thời gian buổi học để mở lại màn điểm danh.'
            : 'Tra cứu điểm danh của toàn trung tâm theo thời gian, trạng thái, lớp và học viên.'
        }
      />
      {scope === 'coach' && <CoachSessionsToday />}
      <section aria-labelledby="attendance-history-heading" className={scope === 'coach' ? 'mt-8' : undefined}>
        {scope === 'coach' && (
          <SectionHeading id="attendance-history-heading" title="Lịch sử điểm danh" description="Chỉ gồm các lớp bạn phụ trách." />
        )}
        {scope === 'manager' && (
          <h2 id="attendance-history-heading" className="sr-only">
            Lịch sử điểm danh
          </h2>
        )}
        <AttendanceHistoryPanel scope={scope} />
      </section>
    </div>
  );
}

/** Buổi dạy hôm qua và hôm nay của Coach (cần API BE-2, hiện chưa có) */
function CoachSessionsToday() {
  const today = todayInCenter();
  const sessions = useCoachSessions({ from: startOfCenterDay(addDays(today, -1)), to: endOfCenterDay(today) });

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="coach-sessions-heading">
      <SectionHeading
        id="coach-sessions-heading"
        title="Buổi dạy cần điểm danh"
        description={`Hôm qua và hôm nay (${formatDate(today)}). Điểm danh mở khi buổi học bắt đầu.`}
      />
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
          pendingApi="GET /api/coaches/me/sessions"
        />
      ) : sessions.data.length === 0 ? (
        <EmptyState compact icon={<CalendarCheck />} title="Không có buổi dạy" description="Bạn không có buổi lớp nhóm nào hôm qua và hôm nay." />
      ) : (
        <ul className="divide-y divide-line">
          {sessions.data.map((session) => (
            <li key={session.id}>
              <Link
                to={`/coach/sessions/${session.id}/attendance`}
                className="flex min-h-16 items-center gap-3 py-3 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-primary"
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
                <ArrowRight className="shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
