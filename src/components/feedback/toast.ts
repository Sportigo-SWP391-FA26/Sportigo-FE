export type ToastTone = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  tone: ToastTone;
  message: string;
};

const DISMISS_AFTER_MS = 4500;

let nextId = 1;
let messages: ToastMessage[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function dismissToast(id: number) {
  messages = messages.filter((item) => item.id !== id);
  emit();
}

// Lưu ngoài React để toast vẫn hiện khi trang vừa chuyển route.
export function toast(message: string, tone: ToastTone = 'success') {
  if (messages.some((item) => item.message === message && item.tone === tone)) return;
  const id = nextId++;
  messages = [...messages.slice(-2), { id, tone, message }];
  emit();
  window.setTimeout(() => dismissToast(id), DISMISS_AFTER_MS);
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts() {
  return messages;
}
