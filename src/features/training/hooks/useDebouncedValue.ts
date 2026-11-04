import { useEffect, useState } from 'react';

/** Trả về giá trị sau khi người dùng ngừng thay đổi `delay` ms (ví dụ ô tìm kiếm) */
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
