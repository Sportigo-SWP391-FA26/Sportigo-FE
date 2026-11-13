import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrencyInput, DateInput, DateTimeInput } from './LocalizedInputs';

describe('localized inputs', () => {
  it('formats Vietnamese currency while returning raw digits', () => {
    const onChange = vi.fn();
    render(<CurrencyInput aria-label="Số tiền" value="1000000" onValueChange={onChange} />);
    expect(screen.getByLabelText('Số tiền')).toHaveValue('1.000.000');
    fireEvent.change(screen.getByLabelText('Số tiền'), { target: { value: '2.500.000' } });
    expect(onChange).toHaveBeenCalledWith('2500000');
  });

  it('shows dates in dd/mm/yyyy and returns ISO date values', () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="Ngày" value="2026-11-07" onValueChange={onChange} />);
    expect(screen.getByLabelText('Ngày')).toHaveValue('07/11/2026');
    fireEvent.change(screen.getByLabelText('Ngày'), { target: { value: '08112026' } });
    expect(onChange).toHaveBeenCalledWith('2026-11-08');
  });

  it('shows date time in Vietnamese order', () => {
    render(<DateTimeInput aria-label="Thời gian" value="2026-11-07T19:30" onValueChange={() => undefined} />);
    expect(screen.getByLabelText('Thời gian')).toHaveValue('07/11/2026 19:30');
  });
});
