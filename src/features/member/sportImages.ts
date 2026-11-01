type SportWithImage = { name: string; imageUrl?: string | null };

const localSportImages = [
  { terms: ['bơi', 'swim'], image: '/images/landing/hero/swimming.webp' },
  { terms: ['yoga'], image: '/images/landing/hero/yoga.webp' },
  { terms: ['cầu lông', 'badminton'], image: '/images/landing/hero/badminton.webp' },
  { terms: ['gym', 'fitness', 'thể hình'], image: '/images/landing/hero/gym.webp' },
];

/** Dùng ảnh thật từ Sport; fallback local chỉ khi dữ liệu cũ chưa có imageUrl. */
export function sportImageUrl(sport: SportWithImage) {
  if (sport.imageUrl) return sport.imageUrl;
  const name = sport.name.toLocaleLowerCase('vi-VN');
  return localSportImages.find(({ terms }) => terms.some((term) => name.includes(term)))?.image
    ?? '/images/landing/hero/gym.webp';
}
