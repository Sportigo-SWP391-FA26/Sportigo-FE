import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDate, formatNumber } from '../format';
import { prefersReducedMotion } from '../motion';
import type { ScoreLevel, ScoreLevelRange } from '../types';

export type TrendPoint = {
  id: number;
  date: string;
  /** Mốc thời gian (ms) để trục X tỉ lệ đúng khoảng cách giữa các lần đánh giá */
  time: number;
  value: number;
  coach: string;
};

type LabelProps = { x?: number | string; y?: number | string; index?: number; value?: unknown };
type TooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

// Màu lấy từ token qua CSS (stroke-primary, fill-muted...) vì thuộc tính SVG không đọc được var().
const chartTokens = [
  '[&_.recharts-line-curve]:stroke-primary',
  '[&_.recharts-line-dot]:fill-primary [&_.recharts-line-dot]:stroke-surface',
  '[&_.recharts-active-dot_circle]:fill-primary [&_.recharts-active-dot_circle]:stroke-surface',
  '[&_.recharts-cartesian-grid_line]:stroke-line',
  '[&_.recharts-cartesian-axis-tick-value]:fill-muted',
  '[&_.recharts-tooltip-cursor]:stroke-muted/50',
  // Dải nền theo mức đánh giá (chỉ khi xem Điểm tổng), cùng màu với chip mức
  '[&_.band-EXCELLENT_path]:fill-accent-lime/14',
  '[&_.band-GOOD_path]:fill-primary/8',
  '[&_.band-AVERAGE_path]:fill-accent-energy/10',
  '[&_.band-NEEDS_IMPROVEMENT_path]:fill-danger/7',
].join(' ');

const bandClass: Record<ScoreLevel, string> = {
  EXCELLENT: 'band-EXCELLENT',
  GOOD: 'band-GOOD',
  AVERAGE: 'band-AVERAGE',
  NEEDS_IMPROVEMENT: 'band-NEEDS_IMPROVEMENT',
};

function TrendTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-card">
      <p className="text-base font-extrabold text-ink">{formatNumber(point.value)}</p>
      <p className="text-xs text-muted">
        {formatDate(point.date)} · Coach {point.coach}
      </p>
    </div>
  );
}

/** Biểu đồ đường một chỉ số qua các lần đánh giá (FR-53). Tải lazy để không tăng bundle chính. */
export default function MetricTrendChart({
  points,
  metricLabel,
  bands,
}: {
  points: TrendPoint[];
  metricLabel: string;
  /** Ngưỡng mức đánh giá: có thì vẽ dải nền và cố định trục theo thang điểm (Điểm tổng, 0–10) */
  bands?: ScoreLevelRange[];
}) {
  const lastIndex = points.length - 1;
  const scaleMax = bands ? Math.max(...bands.map((band) => band.max)) : 0;
  // Mỗi dải kéo tới min của dải kế trên để các dải liền nhau (vd Khá 7 → 8,5)
  const bandTop = (min: number) => bands?.map((band) => band.min).filter((value) => value > min).sort((a, b) => a - b)[0] ?? scaleMax;
  const first = points[0];
  const last = points[lastIndex];
  const values = points.map((point) => point.value);
  // Vạch trục Y là số nguyên khi khoảng giá trị đủ rộng (tránh 5,75 / 6,5 ...)
  const span = Math.ceil(Math.max(...values)) - Math.floor(Math.min(...values));

  // Chỉ ghi giá trị ở điểm cuối; các điểm khác xem qua tooltip hoặc dạng bảng
  const renderEndLabel = ({ x, y, index, value }: LabelProps) =>
    index === lastIndex ? (
      <text x={Number(x)} y={Number(y) - 12} textAnchor="middle" className="fill-ink text-xs font-extrabold">
        {formatNumber(Number(value))}
      </text>
    ) : null;

  return (
    <div
      role="img"
      aria-label={`Biểu đồ ${metricLabel}: ${points.length} lần đánh giá, từ ${formatNumber(first.value)} ngày ${formatDate(first.date)} đến ${formatNumber(last.value)} ngày ${formatDate(last.date)}.`}
      className={`h-[260px] w-full ${chartTokens}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 24, right: 24, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeWidth={1} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={points.map((point) => point.time)}
            tickFormatter={(time: number) => formatDate(new Date(time).toISOString().slice(0, 10)).slice(0, 5)}
            padding={{ left: 20, right: 28 }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            fontSize={12}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            domain={bands ? [0, scaleMax] : [(min: number) => Math.floor(min), (max: number) => Math.ceil(max)]}
            ticks={bands ? [0, ...bands.map((band) => band.min).filter((min) => min > 0), scaleMax].sort((a, b) => a - b) : undefined}
            allowDecimals={bands ? true : span < 3}
            tickFormatter={(value: number) => formatNumber(value)}
          />
          {bands?.map((band) => (
            <ReferenceArea
              key={band.level}
              y1={band.min}
              y2={bandTop(band.min)}
              className={bandClass[band.level]}
              fillOpacity={1}
              strokeOpacity={0}
              ifOverflow="hidden"
            />
          ))}
          <Tooltip content={TrendTooltip} cursor={{ strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="value"
            name={metricLabel}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            label={renderEndLabel}
            isAnimationActive={!prefersReducedMotion()}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
