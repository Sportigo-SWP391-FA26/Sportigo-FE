import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { InlineAlert } from '../../components/ui/States';
import { iconButtonClass, textareaClass } from '../../components/ui/styles';
import { parseApiError } from '../training/errors';
import { formatDate } from '../training/format';

// FR-66/67: thanh chuyển tuần dùng chung cho các trang nhân sự
export function WeekNav({ from, to, onShift, onToday }: { from: string; to: string; onShift: (days: number) => void; onToday: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={iconButtonClass} onClick={() => onShift(-7)} aria-label="Tuần trước">
        <CaretLeft aria-hidden="true" />
      </button>
      <p className="min-w-44 text-center text-sm font-bold text-ink" aria-live="polite">
        {formatDate(from)} – {formatDate(to)}
      </p>
      <button type="button" className={iconButtonClass} onClick={() => onShift(7)} aria-label="Tuần sau">
        <CaretRight aria-hidden="true" />
      </button>
      <Button size="sm" variant="ghost" onClick={onToday}>
        Tuần này
      </Button>
    </div>
  );
}

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  label: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** cho phép bỏ trống (ví dụ ghi chú khi duyệt) */
  optional?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
};

// note: hộp thoại nhập lý do dùng cho báo vắng, hủy ca, từ chối/duyệt sửa công
export function ReasonDialog({ open, title, description, label, confirmLabel, tone = 'primary', optional, onClose, onSubmit }: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trimmed = reason.trim();
  // note: backend yêu cầu lý do tối thiểu 3 ký tự
  const invalid = !optional && trimmed.length < 3;

  const close = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (invalid) {
      setError('Vui lòng nhập lý do (tối thiểu 3 ký tự).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      close();
    } catch (caught) {
      setError(parseApiError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Đóng
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={submit} loading={saving}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field id="workforce-reason" label={label} required={!optional}>
          <textarea id="workforce-reason" className={textareaClass} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
        {error && <InlineAlert>{error}</InlineAlert>}
      </div>
    </Dialog>
  );
}
