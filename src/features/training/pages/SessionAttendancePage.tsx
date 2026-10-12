import { ArrowClockwise, ArrowLeft, CheckSquare, LockKey, NotePencil, Users } from '@phosphor-icons/react';
import { useEffect, useId, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { toast } from '../../../components/feedback/toast';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { ConfirmDialog } from '../components/ui/Dialog';
import { SegmentedControl } from '../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton, Skeleton } from '../components/ui/States';
import { cardClass, describedBy, textareaClass } from '../components/ui/styles';
import { parseApiError } from '../errors';
import { formatDate, formatTime, formatWeekday } from '../format';
import { useMarkAttendance, useSessionRoster } from '../hooks/useAttendance';
import { attendanceStatuses, attendanceStatusLabels } from '../labels';
import type { AttendanceStatus, MarkAttendanceRecord, SessionRoster } from '../types';

const NOTE_MAX = 500;

type Draft = { status: AttendanceStatus | null; note: string };
type Drafts = Record<number, Draft>;

const statusOptions = attendanceStatuses.map((value) => ({ value, label: attendanceStatusLabels[value] }));

// Màu khi được chọn: chữ luôn đủ tương phản với nền
const checkedStyles: Record<AttendanceStatus, string> = {
  PRESENT: 'border-accent-lime bg-accent-lime text-ink',
  LATE: 'border-accent-energy bg-accent-energy text-ink',
  ABSENT: 'border-danger bg-danger text-white',
  EXCUSED: 'border-accent-sky bg-accent-sky text-ink',
};

function draftsFrom(roster: SessionRoster): Drafts {
  return Object.fromEntries(
    roster.students.map((student) => [
      student.registrationId,
      { status: student.attendance?.status ?? null, note: student.attendance?.note ?? '' },
    ]),
  );
}

function sameDraft(a: Draft | undefined, b: Draft | undefined) {
  return a?.status === b?.status && (a?.note ?? '').trim() === (b?.note ?? '').trim();
}

function lockReason(roster: SessionRoster, now = new Date()) {
  if (roster.session.status === 'CANCELLED') return 'Buổi học đã bị hủy nên không thể điểm danh.';
  if (now < new Date(roster.session.startsAt)) {
    return `Buổi học chưa bắt đầu. Bạn có thể điểm danh từ ${formatTime(roster.session.startsAt)} ngày ${formatDate(roster.session.startsAt)}.`;
  }
  return 'Đã quá thời hạn sửa điểm danh sau khi buổi học kết thúc, hoặc lớp đã bị hủy.';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

// FR-47 · /coach/sessions/:sessionId/attendance
export function SessionAttendancePage() {
  const sessionId = Number(useParams().sessionId);
  const roster = useSessionRoster(sessionId);
  // Tăng version để nạp lại bản nháp từ dữ liệu mới nhất (sau xung đột hoặc khi Coach bấm Tải lại)
  const [version, setVersion] = useState(0);

  const reload = async () => {
    await roster.refetch();
    setVersion((value) => value + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <Link
        to="/coach/attendance"
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-bold text-primary-deep hover:underline"
      >
        <ArrowLeft aria-hidden="true" /> Lịch sử điểm danh
      </Link>
      {!Number.isInteger(sessionId) || sessionId <= 0 ? (
        <EmptyState title="Đường dẫn buổi học không hợp lệ" description="Hãy mở buổi học từ danh sách điểm danh." />
      ) : roster.isPending ? (
        <div className="space-y-4">
          <div className={`${cardClass} space-y-3 p-5`} aria-hidden="true">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <ListSkeleton rows={4} label="Đang tải danh sách học viên…" />
        </div>
      ) : roster.isError ? (
        <ErrorState error={roster.error} onRetry={() => roster.refetch()} retrying={roster.isRefetching} />
      ) : (
        <AttendanceSheet key={version} sessionId={sessionId} roster={roster.data} onReload={reload} reloading={roster.isRefetching} />
      )}
    </div>
  );
}

type SheetProps = {
  sessionId: number;
  roster: SessionRoster;
  onReload: () => Promise<void>;
  reloading: boolean;
};

function AttendanceSheet({ sessionId, roster, onReload, reloading }: SheetProps) {
  const [baseline, setBaseline] = useState(() => draftsFrom(roster));
  const [drafts, setDrafts] = useState(baseline);
  const [openNotes, setOpenNotes] = useState<Set<number>>(
    () => new Set(roster.students.filter((student) => student.attendance?.note).map((student) => student.registrationId)),
  );
  const [lockedMessage, setLockedMessage] = useState<string | null>(roster.isLocked ? lockReason(roster) : null);
  const [invalidIds, setInvalidIds] = useState<number[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmPartial, setConfirmPartial] = useState(false);
  const mark = useMarkAttendance(sessionId);

  const locked = lockedMessage !== null;
  const students = roster.students;
  const dirty = students.some((student) => !sameDraft(drafts[student.registrationId], baseline[student.registrationId]));
  const unmarked = students.filter((student) => !drafts[student.registrationId]?.status);
  const counts = Object.fromEntries(
    attendanceStatuses.map((status) => [status, students.filter((student) => drafts[student.registrationId]?.status === status).length]),
  ) as Record<AttendanceStatus, number>;

  // Cảnh báo khi rời trang (trong ứng dụng hoặc đóng tab) mà chưa lưu
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !locked && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty || locked) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, locked]);

  const updateDraft = (registrationId: number, patch: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [registrationId]: { ...current[registrationId], ...patch } }));
    setInvalidIds((ids) => ids.filter((id) => id !== registrationId));
  };

  const markAllPresent = () =>
    setDrafts((current) =>
      Object.fromEntries(Object.entries(current).map(([id, draft]) => [id, { ...draft, status: 'PRESENT' as const }])),
    );

  const save = () => {
    const records: MarkAttendanceRecord[] = students.flatMap((student) => {
      const draft = drafts[student.registrationId];
      if (!draft?.status) return [];
      const note = draft.note.trim();
      return [{ classRegistrationId: student.registrationId, status: draft.status, ...(note ? { note } : {}) }];
    });
    setConfirmPartial(false);
    setSaveError(null);
    mark.mutate(
      { records },
      {
        onSuccess: () => {
          setBaseline(drafts);
          setInvalidIds([]);
          toast(`Đã lưu điểm danh cho ${records.length} học viên.`);
        },
        onError: (error) => {
          const apiError = parseApiError(error);
          if (apiError.code === 'ATTENDANCE_LOCKED') {
            // Xung đột: buổi vừa bị khóa. Chuyển sang chỉ xem và nạp trạng thái mới nhất.
            setLockedMessage(`${apiError.message} ${lockReason(roster)}`);
            toast('Buổi học đã khóa dữ liệu điểm danh. Trang đã chuyển sang chế độ chỉ xem.', 'error');
            if (!roster.isLocked) void onReload();
            return;
          }
          if (apiError.code === 'REGISTRATION_NOT_ELIGIBLE') {
            const ids = (apiError.details as { invalidRegistrationIds?: number[] } | undefined)?.invalidRegistrationIds ?? [];
            setInvalidIds(ids);
          }
          setSaveError(apiError.message);
        },
      },
    );
  };

  const requestSave = () => (unmarked.length > 0 ? setConfirmPartial(true) : save());
  const { session } = roster;

  return (
    <div>
      <header className={`${cardClass} sticky top-16 z-20 p-4 sm:p-5 lg:top-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold tracking-[.08em] text-primary-deep uppercase">Điểm danh buổi học</p>
            <h1 className="mt-1 text-xl leading-snug font-extrabold tracking-[-.02em] text-ink sm:text-2xl">{session.class.name}</h1>
            <p className="mt-1 text-[13px] text-muted">
              {formatWeekday(session.startsAt)}, {formatDate(session.startsAt)} · {formatTime(session.startsAt)}–{formatTime(session.endsAt)}
              {session.room && ` · ${session.room.name}`} · {students.length} học viên
            </p>
          </div>
          {locked ? (
            <Chip tone="warning" dot>
              Đã khóa
            </Chip>
          ) : (
            <Chip tone="success" dot>
              Đang mở điểm danh
            </Chip>
          )}
        </div>
        {students.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 text-[13px] text-muted" aria-live="polite">
            {attendanceStatuses.map((status) => (
              <span key={status}>
                {attendanceStatusLabels[status]} <b className="text-ink">{counts[status]}</b>
              </span>
            ))}
            <span>
              Chưa chọn <b className="text-ink">{unmarked.length}</b>
            </span>
          </p>
        )}
      </header>

      {locked && (
        <div className="mt-4">
          <InlineAlert tone="warning">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <LockKey aria-hidden="true" /> Chỉ xem
            </span>
            <span className="block">{lockedMessage}</span>
          </InlineAlert>
        </div>
      )}

      {students.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Users />}
            title="Chưa có học viên để điểm danh"
            description="Chỉ học viên đã xác nhận đăng ký lớp (CONFIRMED) mới xuất hiện trong danh sách điểm danh."
          />
        </div>
      ) : (
        <>
          {!locked && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <Button variant="secondary" onClick={markAllPresent} icon={<CheckSquare aria-hidden="true" />} disabled={mark.isPending}>
                Tất cả có mặt
              </Button>
              <Button variant="ghost" onClick={onReload} loading={reloading} icon={<ArrowClockwise aria-hidden="true" />}>
                Tải lại danh sách
              </Button>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {students.map((student) => (
              <StudentRow
                key={student.registrationId}
                name={student.member.displayName}
                code={student.member.memberCode}
                registrationId={student.registrationId}
                draft={drafts[student.registrationId]}
                noteOpen={openNotes.has(student.registrationId)}
                onToggleNote={() =>
                  setOpenNotes((current) => {
                    const next = new Set(current);
                    if (next.has(student.registrationId)) next.delete(student.registrationId);
                    else next.add(student.registrationId);
                    return next;
                  })
                }
                invalid={invalidIds.includes(student.registrationId)}
                disabled={locked || mark.isPending}
                readOnly={locked}
                onChange={(patch) => updateDraft(student.registrationId, patch)}
              />
            ))}
          </ul>

          {saveError && (
            <div className="mt-4">
              <InlineAlert>
                {saveError}
                {invalidIds.length > 0 && (
                  <button type="button" onClick={onReload} className="ml-1 font-bold underline">
                    Tải lại danh sách mới nhất
                  </button>
                )}
              </InlineAlert>
            </div>
          )}

          {!locked && (
            <div className="sticky bottom-0 z-20 -mx-4 mt-5 border-t border-line bg-surface/95 px-4 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:mx-0 sm:rounded-card sm:border sm:shadow-raised">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted" aria-live="polite">
                  {dirty ? (unmarked.length > 0 ? `Còn ${unmarked.length} học viên chưa chọn` : 'Có thay đổi chưa lưu') : 'Không có thay đổi'}
                </p>
                <Button onClick={requestSave} loading={mark.isPending} disabled={!dirty || unmarked.length === students.length}>
                  {mark.isPending ? 'Đang lưu…' : 'Lưu điểm danh'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmPartial}
        title="Lưu khi chưa điểm danh đủ?"
        description={`Còn ${unmarked.length} học viên chưa chọn trạng thái: ${unmarked.map((student) => student.member.displayName).join(', ')}. Hệ thống chỉ lưu những học viên đã chọn; bạn có thể điểm danh bổ sung sau.`}
        confirmLabel="Lưu những học viên đã chọn"
        onConfirm={save}
        onCancel={() => setConfirmPartial(false)}
      />
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Rời trang khi chưa lưu?"
        description="Các lựa chọn điểm danh chưa được lưu sẽ bị mất."
        confirmLabel="Rời trang"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}

type StudentRowProps = {
  name: string;
  code: string;
  registrationId: number;
  draft: Draft | undefined;
  noteOpen: boolean;
  onToggleNote: () => void;
  invalid: boolean;
  disabled: boolean;
  readOnly: boolean;
  onChange: (patch: Partial<Draft>) => void;
};

function StudentRow({ name, code, registrationId, draft, noteOpen, onToggleNote, invalid, disabled, readOnly, onChange }: StudentRowProps) {
  const noteId = useId();
  const errorId = `${noteId}-row-error`;
  const note = draft?.note ?? '';

  return (
    <li className={`${cardClass} p-4 ${invalid ? 'ring-2 ring-danger' : ''}`} aria-describedby={invalid ? errorId : undefined}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3 lg:w-56 lg:shrink-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-extrabold text-primary-deep" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{name}</p>
            <p className="text-xs text-muted">{code}</p>
          </div>
        </div>
        <SegmentedControl
          className="flex-1"
          name={`attendance-${registrationId}`}
          legend={`Trạng thái của ${name}`}
          hideLegend
          options={statusOptions}
          value={draft?.status}
          disabled={disabled}
          onChange={(status) => onChange({ status })}
          optionClassName={(value, checked) =>
            checked ? checkedStyles[value] : 'border-line bg-surface text-ink hover:border-primary/40 hover:bg-primary/5'
          }
        />
      </div>

      {invalid && (
        <p id={errorId} className="mt-2 text-xs font-semibold text-danger">
          Học viên chưa đăng ký hợp lệ cho buổi học này.
        </p>
      )}

      <div className="mt-2">
        {noteOpen ? (
          <div className="mt-1">
            <label htmlFor={noteId} className="mb-1 block text-xs font-bold text-ink">
              Ghi chú cho {name}
            </label>
            <textarea
              id={noteId}
              className={`${textareaClass} min-h-16`}
              value={note}
              maxLength={NOTE_MAX}
              disabled={disabled}
              placeholder="Ví dụ: Đến muộn 10 phút"
              aria-describedby={describedBy(noteId, { hint: true })}
              onChange={(event) => onChange({ note: event.target.value })}
            />
            <p id={`${noteId}-hint`} className="mt-1 text-right text-[11px] text-muted">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
        ) : readOnly ? null : (
          <button
            type="button"
            onClick={onToggleNote}
            disabled={disabled}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-1 text-[13px] font-bold text-primary-deep hover:underline disabled:text-muted disabled:no-underline"
          >
            <NotePencil aria-hidden="true" /> Thêm ghi chú
          </button>
        )}
      </div>
    </li>
  );
}
