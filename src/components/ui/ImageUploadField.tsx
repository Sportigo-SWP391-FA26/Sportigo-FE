import { CheckCircle, ImageSquare, UploadSimple } from '@phosphor-icons/react';
import { useId, useRef, useState } from 'react';
import { uploadImage, type UploadPurpose } from '../../features/uploads/api';
import { parseApiError } from '../../features/training/errors';
import { Button } from './Button';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Props = {
  label: string;
  value: string | null | undefined;
  onChange: (secureUrl: string) => void;
  purpose: UploadPurpose;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  previewClassName?: string;
};

export function ImageUploadField({ label, value, onChange, purpose, hint, disabled, required, previewClassName }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);

  const selectFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setUploaded(false);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Ảnh phải nhỏ hơn hoặc bằng 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadImage(file, purpose);
      onChange(result.secureUrl);
      setUploaded(true);
    } catch (uploadError) {
      setError(`${parseApiError(uploadError).message}. Ảnh hiện tại vẫn được giữ nguyên.`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-2">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
        {hint && <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-muted">{hint}</p>}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-canvas p-3 sm:flex-row sm:items-center">
        <div className={`relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white sm:w-36 ${previewClassName ?? ''}`}>
          {value ? <img src={value} alt={`Xem trước ${label.toLowerCase()}`} className="size-full object-cover" /> : <ImageSquare size={34} className="text-muted" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            aria-describedby={`${id}-hint ${error ? `${id}-error` : ''}`.trim()}
            onChange={(event) => void selectFile(event.target.files?.[0])}
          />
          <Button type="button" size="sm" variant="secondary" icon={<UploadSimple aria-hidden="true" />} loading={uploading} disabled={disabled} onClick={() => inputRef.current?.click()}>
            {value ? 'Thay ảnh' : 'Chọn ảnh'}
          </Button>
          <p className="mt-2 text-xs leading-5 text-muted">JPG, PNG hoặc WebP · tối đa 5 MB</p>
          {uploaded && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle weight="fill" aria-hidden="true" />Đã tải ảnh lên Cloudinary</p>}
          {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
