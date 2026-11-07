import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { ScoreChip, ScoreLevelLegend } from './ScoreLevel';

afterEach(() => cleanup());

describe('Mức đánh giá theo Điểm tổng (FR-52, FR-53)', () => {
  test('hiện điểm kèm mức do backend tính', () => {
    render(<ScoreChip assessment={{ score: '7.8', level: 'GOOD' }} />);
    expect(screen.getByText('7,8 · Khá')).toBeInTheDocument();
  });

  test('không chấm Điểm tổng thì không hiện chip', () => {
    const { container } = render(<ScoreChip assessment={{ score: null, level: null }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('backend chưa trả level thì giữ cách hiển thị cũ', () => {
    render(<ScoreChip assessment={{ score: '8.5' }} />);
    expect(screen.getByText('Điểm 8,5')).toBeInTheDocument();
  });

  test('chú thích liệt kê ngưỡng lấy từ backend', () => {
    render(
      <ScoreLevelLegend
        levels={[
          { level: 'EXCELLENT', label: 'Xuất sắc', min: 8.5, max: 10 },
          { level: 'NEEDS_IMPROVEMENT', label: 'Cần cải thiện', min: 0, max: 4.9 },
        ]}
      />,
    );
    const legend = screen.getByRole('list', { name: 'Các mức đánh giá theo Điểm tổng' });
    expect(legend).toHaveTextContent('Xuất sắc: 8,5–10');
    expect(legend).toHaveTextContent('Cần cải thiện: 0–4,9');
  });
});
