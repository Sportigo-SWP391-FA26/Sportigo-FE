import { useState } from 'react';

export function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase('vi'))
    .join('');
}

type AvatarProps = {
  name: string;
  src?: string | null;
  alt?: string;
  /** Kích thước và hình dạng của ảnh, ví dụ `size-9 rounded-full` */
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function Avatar({ name, src, alt, className = 'size-9 rounded-full', imageClassName = '', fallbackClassName = 'text-xs' }: AvatarProps) {
  // Nhớ URL bị lỗi thay vì cờ true/false để ảnh mới được thử lại khi danh sách đổi.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (src && src !== failedSrc) {
    return <img src={src} alt={alt ?? `Ảnh của ${name}`} loading="lazy" className={`object-cover ${className} ${imageClassName}`} onError={() => setFailedSrc(src)} />;
  }
  return (
    <span className={`grid shrink-0 place-items-center bg-primary/10 font-extrabold text-primary-deep ${className} ${fallbackClassName}`} role="img" aria-label={`${name} chưa có ảnh đại diện`}>
      {avatarInitials(name) || '?'}
    </span>
  );
}
