import { useState, type InputHTMLAttributes } from 'react';
import { formatMoneyInput, maskDate, maskDateTime, normalizeMoneyInput, parseVietnameseDate, parseVietnameseDateTime } from './localizedInputUtils';

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string | number;
  onValueChange: (rawValue: string) => void;
};

export function CurrencyInput({ value, onValueChange, name, ...props }: CurrencyInputProps) {
  const rawValue = normalizeMoneyInput(value);
  return (
    <>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={formatMoneyInput(rawValue)}
        onChange={(event) => onValueChange(normalizeMoneyInput(event.target.value))}
      />
      {name && <input type="hidden" name={name} value={rawValue} />}
    </>
  );
}

function dateDisplayFromIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function dateTimeDisplayFromIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : value;
}

type LocalizedDateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (isoValue: string) => void;
};

export function DateInput({ value, onValueChange, name, ...props }: LocalizedDateInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? dateDisplayFromIso(value);

  return (
    <>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={props.placeholder ?? 'dd/mm/yyyy'}
        value={display}
        onChange={(event) => {
          if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) {
            onValueChange(event.target.value);
            setDraft(dateDisplayFromIso(event.target.value));
            return;
          }
          const next = maskDate(event.target.value);
          setDraft(next);
          if (!next) onValueChange('');
          else {
            const parsed = parseVietnameseDate(next);
            if (parsed) onValueChange(parsed);
          }
        }}
        onBlur={(event) => { setDraft(null); props.onBlur?.(event); }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}

export function DateTimeInput({ value, onValueChange, name, ...props }: LocalizedDateInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? dateTimeDisplayFromIso(value);

  return (
    <>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={props.placeholder ?? 'dd/mm/yyyy hh:mm'}
        value={display}
        onChange={(event) => {
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.target.value)) {
            onValueChange(event.target.value);
            setDraft(dateTimeDisplayFromIso(event.target.value));
            return;
          }
          const next = maskDateTime(event.target.value);
          setDraft(next);
          if (!next) onValueChange('');
          else {
            const parsed = parseVietnameseDateTime(next);
            if (parsed) onValueChange(parsed);
          }
        }}
        onBlur={(event) => { setDraft(null); props.onBlur?.(event); }}
      />
      {name && <input type="hidden" name={name} value={value} />}
    </>
  );
}
