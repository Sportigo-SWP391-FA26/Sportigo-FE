export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isDesktopViewport() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1024px)').matches;
}

/** Cuộn tới phần tử; tắt hiệu ứng khi người dùng chọn giảm chuyển động */
export function scrollToElement(element: Element | null) {
  element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}
