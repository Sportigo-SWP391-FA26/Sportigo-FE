import { formatNumber, toScore } from '../format';
import { scoreLevelLabels, scoreLevelTones } from '../labels';
import type { ProgressAssessment, ScoreLevelRange } from '../types';
import { Chip } from '../../../components/ui/Chip';

/** Điểm tổng (thang 10) kèm mức do backend tính, ví dụ "7,8 · Khá" (FR-52, FR-53) */
export function ScoreChip({ assessment }: { assessment: Pick<ProgressAssessment, 'score' | 'level'> }) {
  const score = toScore(assessment.score);
  if (score === null) return null;
  // Backend cũ chưa trả level thì giữ cách hiển thị trước đây
  if (!assessment.level) return <Chip tone="success">Điểm {formatNumber(score)}</Chip>;
  return (
    <Chip tone={scoreLevelTones[assessment.level]} dot title={`Điểm tổng ${formatNumber(score)}/10`}>
      {formatNumber(score)} · {scoreLevelLabels[assessment.level]}
    </Chip>
  );
}

/** Chú thích ngưỡng mức đánh giá, lấy từ backend để không lệch với cách tính */
export function ScoreLevelLegend({ levels }: { levels: ScoreLevelRange[] }) {
  return (
    <ul className="flex flex-wrap justify-end gap-x-4 gap-y-2" aria-label="Các mức đánh giá theo Điểm tổng">
      {levels.map((entry) => (
        <li key={entry.level}>
          <Chip tone={scoreLevelTones[entry.level]} dot>
            {entry.label}: {formatNumber(entry.min)}–{formatNumber(entry.max)}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
