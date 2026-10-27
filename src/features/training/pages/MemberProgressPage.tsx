import { CalendarCheck, ChartLineUp, ClipboardText, Medal, Table } from '@phosphor-icons/react';
import { lazy, Suspense, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AssessmentCard, ContextChip } from '../components/AssessmentCard';
import { AttendanceHistoryPanel } from '../components/AttendanceHistoryPanel';
import type { TrendPoint } from '../components/MetricTrendChart';
import { Button } from '../components/ui/Button';
import { Card, PageHeader, SectionHeading, StatTile } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Field } from '../components/ui/Field';
import { EmptyState, ErrorState, InlineAlert, ListSkeleton, Skeleton } from '../components/ui/States';
import { inputClass, tabPanelProps } from '../components/ui/styles';
import { Tabs } from '../components/ui/Tabs';
import { formatDate, formatNumber, formatPercent, monthRange, toScore, todayInCenter, weekRange } from '../format';
import { useAttendanceSummary } from '../hooks/useAttendance';
import { useMyTraining } from '../hooks/useMemberTraining';
import type { ProgressAssessment } from '../types';

const MetricTrendChart = lazy(() => import('../components/MetricTrendChart'));

const SCORE_KEY = '__score__';
const ASSESSMENTS_PER_PAGE = 10;
const TAB_PREFIX = 'progress';
const tabs = [
  { value: 'assessments', label: 'Đánh giá tiến độ' },
  { value: 'attendance', label: 'Lịch sử điểm danh' },
] as const;

// FR-53, FR-48 · /member/progress
export function MemberProgressPage() {
  const training = useMyTraining();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'attendance' ? 'attendance' : 'assessments';
  const assessments = training.data?.assessments ?? [];

  return (
    <div className="mx-auto w-full max-w-[1240px]">
      <PageHeader
        eyebrow="Tiến độ"
        title="Kết quả & Tiến độ"
        description="Theo dõi chuyên cần và các lần Coach đánh giá. Số liệu lấy trực tiếp từ hệ thống điểm danh và đánh giá."
      />

      <AttendanceStats latest={assessments[0]} trainingPending={training.isPending} />

      <div className="mt-6">
        {training.isPending ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
            <Card className="p-6">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-6 h-[220px] w-full" />
            </Card>
            <Card className="space-y-3 p-6">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </Card>
          </div>
        ) : training.error ? (
          <ErrorState error={training.error} onRetry={() => training.refetch()} retrying={training.isRefetching} />
        ) : assessments.length === 0 ? (
          <EmptyState
            icon={<ChartLineUp />}
            title="Chưa có đánh giá tiến độ"
            description="Coach sẽ ghi đánh giá và chỉ số sau các buổi tập. Biểu đồ xu hướng xuất hiện khi có ít nhất hai lần đánh giá."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)] xl:items-start">
            <TrendCard assessments={assessments} />
            <LatestAssessment assessment={assessments[0]} />
          </div>
        )}
      </div>

      <section className="mt-10" aria-label="Chi tiết">
        <Tabs
          label="Chi tiết tiến độ"
          idPrefix={TAB_PREFIX}
          tabs={tabs}
          value={tab}
          onChange={(value) => setParams({ tab: value }, { replace: true })}
        />
        <div {...tabPanelProps(TAB_PREFIX, tab)} className="mt-5 focus-visible:outline-none">
          {tab === 'assessments' ? (
            training.isPending ? (
              <ListSkeleton rows={3} label="Đang tải đánh giá…" />
            ) : training.error ? (
              <ErrorState error={training.error} onRetry={() => training.refetch()} retrying={training.isRefetching} />
            ) : (
              <AssessmentHistory assessments={assessments} />
            )
          ) : (
            <AttendanceHistoryPanel scope="member" />
          )}
        </div>
      </section>
    </div>
  );
}

function AttendanceStats({ latest, trainingPending }: { latest?: ProgressAssessment; trainingPending: boolean }) {
  const today = todayInCenter();
  const week = weekRange(today);
  const month = monthRange(today);
  const weekSummary = useAttendanceSummary(week);
  const monthSummary = useAttendanceSummary(month);
  const error = weekSummary.error ?? monthSummary.error;
  const pending = <Skeleton className="mt-1 h-7 w-16" />;
  const monthNumber = Number(today.slice(5, 7));

  const markedHint = (marked: number) =>
    marked > 0 ? `Trên ${marked} buổi đã được điểm danh` : 'Chưa có buổi nào được điểm danh';

  return (
    <div>
      {error && (
        <div className="mb-4">
          <InlineAlert>
            Không tải được số liệu chuyên cần.{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                weekSummary.refetch();
                monthSummary.refetch();
              }}
            >
              Thử lại
            </button>
          </InlineAlert>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={<CalendarCheck />}
          label="Buổi tham gia tuần này"
          value={weekSummary.data ? weekSummary.data.attended : error ? '—' : pending}
          hint={weekSummary.data ? `${markedHint(weekSummary.data.marked)} · ${formatDate(week.from)}–${formatDate(week.to)}` : undefined}
        />
        <StatTile
          icon={<ClipboardText />}
          tone="sky"
          label={`Buổi tham gia tháng ${monthNumber}`}
          value={monthSummary.data ? monthSummary.data.attended : error ? '—' : pending}
          hint={monthSummary.data ? markedHint(monthSummary.data.marked) : undefined}
        />
        <StatTile
          icon={<ChartLineUp />}
          tone="lime"
          label="Chuyên cần tháng này"
          value={
            monthSummary.data
              ? monthSummary.data.marked > 0
                ? formatPercent(monthSummary.data.attended / monthSummary.data.marked)
                : '—'
              : error
                ? '—'
                : pending
          }
          hint="(Có mặt + Muộn) / số buổi đã điểm danh"
        />
        <StatTile
          icon={<Medal />}
          tone="energy"
          label="Đánh giá gần nhất"
          value={trainingPending ? pending : latest ? formatDate(latest.assessmentDate) : 'Chưa có'}
          hint={
            latest
              ? `Coach ${latest.coach.displayName}${latest.nextAssessmentDate ? ` · lần tới ${formatDate(latest.nextAssessmentDate)}` : ''}`
              : undefined
          }
        />
      </div>
    </div>
  );
}

type MetricOption = { key: string; label: string; count: number };

function metricOptions(assessments: ProgressAssessment[]): MetricOption[] {
  const counts = new Map<string, number>();
  for (const assessment of assessments) {
    for (const [name, value] of Object.entries(assessment.metrics ?? {})) {
      if (typeof value === 'number' && Number.isFinite(value)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const options = [...counts.entries()].map(([key, count]) => ({ key, label: key, count }));
  const scored = assessments.filter((assessment) => toScore(assessment.score) !== null).length;
  if (scored > 0) options.push({ key: SCORE_KEY, label: 'Điểm tổng', count: scored });
  return options.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'));
}

function trendPoints(assessments: ProgressAssessment[], metric: string): TrendPoint[] {
  return [...assessments]
    .sort((a, b) => a.assessmentDate.localeCompare(b.assessmentDate) || a.createdAt.localeCompare(b.createdAt))
    .flatMap((assessment) => {
      const value = metric === SCORE_KEY ? toScore(assessment.score) : assessment.metrics?.[metric];
      if (typeof value !== 'number' || !Number.isFinite(value)) return [];
      return [{ id: assessment.id, date: assessment.assessmentDate, time: Date.parse(`${assessment.assessmentDate}T00:00:00Z`), value, coach: assessment.coach.displayName }];
    });
}

function TrendCard({ assessments }: { assessments: ProgressAssessment[] }) {
  const selectId = useId();
  const options = metricOptions(assessments);
  const [selected, setSelected] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const metric = options.find((option) => option.key === selected) ?? options[0];
  const points = metric ? trendPoints(assessments, metric.key) : [];

  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading
        title={metric ? `Xu hướng: ${metric.label}` : 'Xu hướng chỉ số'}
        description="Mỗi điểm là một lần Coach đánh giá. Di chuột hoặc xem dạng bảng để đọc từng giá trị."
      />
      {!metric ? (
        <EmptyState compact title="Chưa có chỉ số dạng số" description="Các lần đánh giá hiện chưa ghi chỉ số nào để vẽ biểu đồ." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field id={selectId} label="Chỉ số" className="w-full sm:w-72">
              <select id={selectId} className={inputClass} value={metric.key} onChange={(event) => setSelected(event.target.value)}>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label} ({option.count} lần)
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="secondary"
              onClick={() => setShowTable((value) => !value)}
              aria-pressed={showTable}
              icon={showTable ? <ChartLineUp aria-hidden="true" /> : <Table aria-hidden="true" />}
            >
              {showTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}
            </Button>
          </div>

          {showTable ? (
            <TrendTable points={points} label={metric.label} />
          ) : points.length < 2 ? (
            <div className="space-y-4">
              <InlineAlert tone="info">Cần ít nhất 2 lần đánh giá có chỉ số này để vẽ xu hướng.</InlineAlert>
              <TrendTable points={points} label={metric.label} />
            </div>
          ) : (
            <Suspense fallback={<Skeleton className="h-[260px] w-full" />}>
              <MetricTrendChart points={points} metricLabel={metric.label} />
            </Suspense>
          )}
        </>
      )}
    </Card>
  );
}

function TrendTable({ points, label }: { points: TrendPoint[]; label: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Giá trị {label} theo ngày đánh giá</caption>
        <thead className="bg-canvas text-xs font-bold text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-2.5">Ngày đánh giá</th>
            <th scope="col" className="px-4 py-2.5">Coach</th>
            <th scope="col" className="px-4 py-2.5 text-right">{label}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {points.map((point) => (
            <tr key={point.id}>
              <td className="px-4 py-2.5">{formatDate(point.date)}</td>
              <td className="px-4 py-2.5 text-muted">{point.coach}</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatNumber(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LatestAssessment({ assessment }: { assessment: ProgressAssessment }) {
  const score = toScore(assessment.score);
  return (
    <Card className="p-5 sm:p-6">
      <SectionHeading title="Nhận xét gần nhất" description={`${formatDate(assessment.assessmentDate)} · Coach ${assessment.coach.displayName}`} />
      <div className="flex flex-wrap gap-1.5">
        <ContextChip context={assessment.context} />
        {score !== null && <Chip tone="success">Điểm {formatNumber(score)}</Chip>}
      </div>
      <blockquote className="mt-4 border-l-4 border-primary/40 pl-4 text-[15px] leading-relaxed text-ink">{assessment.coachComment}</blockquote>
      {assessment.recommendation && (
        <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink/90">
          <span className="font-bold text-ink">Khuyến nghị: </span>
          {assessment.recommendation}
        </p>
      )}
      {assessment.nextAssessmentDate && (
        <p className="mt-3 text-xs text-muted">Lần đánh giá tiếp theo: {formatDate(assessment.nextAssessmentDate)}</p>
      )}
    </Card>
  );
}

function AssessmentHistory({ assessments }: { assessments: ProgressAssessment[] }) {
  const [visible, setVisible] = useState(ASSESSMENTS_PER_PAGE);
  if (assessments.length === 0) {
    return <EmptyState title="Chưa có đánh giá" description="Các lần đánh giá của Coach sẽ hiển thị tại đây, mới nhất trước." />;
  }
  return (
    <div>
      <ol className="space-y-3">
        {assessments.slice(0, visible).map((assessment) => (
          <li key={assessment.id}>
            <AssessmentCard assessment={assessment} />
          </li>
        ))}
      </ol>
      {visible < assessments.length && (
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={() => setVisible((value) => value + ASSESSMENTS_PER_PAGE)}>
            Xem thêm ({assessments.length - visible} đánh giá)
          </Button>
        </div>
      )}
    </div>
  );
}
