import { formatDate, formatNumber } from '../format';
import { ScoreChip } from './ScoreLevel';
import type { AssessmentContext, ProgressAssessment } from '../types';
import { Chip } from '../../../components/ui/Chip';
import { cardClass } from '../../../components/ui/styles';

export function ContextChip({ context }: { context: AssessmentContext | null }) {
  if (!context) return <Chip>Không rõ ngữ cảnh</Chip>;
  const label =
    context.type === 'GROUP_CLASS' ? `Lớp nhóm · ${context.class.name}` : `Khóa 1-1 · ${context.course.name}`;
  return (
    <Chip tone={context.type === 'GROUP_CLASS' ? 'info' : 'primary'} title={label} className="max-w-[260px]">
      {label}
    </Chip>
  );
}

export function AssessmentCard({ assessment, showMember = false }: { assessment: ProgressAssessment; showMember?: boolean }) {
  const metrics = Object.entries(assessment.metrics ?? {});

  return (
    <article className={`${cardClass} p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">
            {formatDate(assessment.assessmentDate)}
            {showMember && ` · ${assessment.member.displayName}`}
          </p>
          {/* Trang Coach chỉ có đánh giá của chính Coach nên không cần tên Coach; Member vẫn cần biết ai đánh giá */}
          {!showMember && <p className="mt-0.5 text-xs text-muted">Coach {assessment.coach.displayName}</p>}
        </div>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <ContextChip context={assessment.context} />
          <ScoreChip assessment={assessment} />
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-ink/90">{assessment.coachComment}</p>

      {metrics.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map(([name, value]) => (
            <div key={name} className="min-w-0 rounded-xl bg-canvas px-3 py-2">
              <dt className="truncate text-xs text-muted" title={name}>
                {name}
              </dt>
              <dd className="text-base font-extrabold text-ink">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {(assessment.recommendation || assessment.nextAssessmentDate) && (
        <div className="mt-4 space-y-1 border-t border-line pt-3 text-[13px] leading-relaxed">
          {assessment.recommendation && (
            <p className="text-ink/90">
              <span className="font-bold text-ink">Khuyến nghị: </span>
              {assessment.recommendation}
            </p>
          )}
          {assessment.nextAssessmentDate && (
            <p className="text-muted">Đánh giá tiếp theo: {formatDate(assessment.nextAssessmentDate)}</p>
          )}
        </div>
      )}
    </article>
  );
}
