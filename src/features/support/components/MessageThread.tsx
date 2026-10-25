import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { formatDateTime } from '../../training/format';
import { Button } from '../../training/components/ui/Button';
import { InlineAlert } from '../../training/components/ui/States';
import { textareaClass } from '../../training/components/ui/styles';
import type { SupportMessage } from '../types';

type Props = {
  messages: SupportMessage[];
  /** Tin nhắn "phía mình" căn phải (Member: do chính mình gửi; nhân viên: do nhân viên gửi) */
  isMine: (message: SupportMessage) => boolean;
  /** Tên hiển thị cho tin "phía mình" */
  mineLabel?: (message: SupportMessage) => string;
  /** null = không cho gửi (yêu cầu đã đóng) */
  onSend: ((content: string) => Promise<unknown>) | null;
  sending: boolean;
  closedNote?: ReactNode;
  error?: string | null;
  /** Ô/nút thêm phía trên nút gửi (FR-56: tick ghi chú nội bộ) */
  extraControls?: ReactNode;
};

// FR-55: khung trao đổi giữa Member và trung tâm; FR-56 dùng lại cho nhân viên
export function MessageThread({ messages, isMine, mineLabel, onSend, sending, closedNote, error, extraControls }: Props) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const trimmed = draft.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!onSend || !trimmed) return;
    try {
      await onSend(trimmed);
      setDraft('');
    } catch {
      // note: lỗi hiển thị qua prop error; giữ nguyên nội dung để người dùng gửi lại
    }
  };

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mb-3 text-base font-extrabold text-ink">
        Trao đổi
      </h2>
      {messages.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Chưa có tin nhắn nào.</p>
      ) : (
        <ol className="space-y-3" aria-label="Tin nhắn">
          {messages.map((message) => {
            const mine = isMine(message);
            return (
              <li key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <article
                  className={`max-w-[85%] rounded-card border px-4 py-3 text-sm ${
                    message.isInternal ? 'border-amber-300 bg-amber-50' : mine ? 'border-primary/20 bg-primary/5' : 'border-line bg-surface'
                  }`}
                >
                  <header className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                    <strong className="text-ink">{mine && mineLabel ? mineLabel(message) : message.sender.displayName}</strong>
                    {message.isInternal && <span className="font-bold text-amber-800">Ghi chú nội bộ</span>}
                    <time dateTime={message.sentAt}>{formatDateTime(message.sentAt)}</time>
                  </header>
                  <p className="leading-relaxed whitespace-pre-wrap text-ink">{message.content}</p>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {onSend ? (
        <form onSubmit={submit} className="mt-4 space-y-2">
          <label htmlFor={`${id}-draft`} className="sr-only">
            Nội dung tin nhắn
          </label>
          <textarea
            id={`${id}-draft`}
            className={textareaClass}
            placeholder="Nhập tin nhắn…"
            maxLength={2000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {error && <InlineAlert>{error}</InlineAlert>}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {extraControls}
            <Button type="submit" loading={sending} disabled={!trimmed}>
              Gửi tin nhắn
            </Button>
          </div>
        </form>
      ) : (
        closedNote && <p className="mt-4 text-sm text-muted">{closedNote}</p>
      )}
    </section>
  );
}
