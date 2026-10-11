# Sportigo Design System

Nguồn thiết kế: Stitch project `6846146267990586367`, hệ “Kinetic Daylight”.

## Visual direction

Giao diện sáng, năng động và cao cấp; kết hợp ảnh thể thao toàn khung với các bề mặt trắng thoáng. Không dùng dark theme hoặc glassmorphism trang trí.

## Tokens

- Primary: `#2563eb`; primary deep: `#004ac6`.
- Sky: `#38bdf8`; lime: `#84cc16`; energy orange: `#f97316`.
- Ink: `#121b2e`; muted: `#64748b`; canvas: `#f8fafc`; surface: `#ffffff`.
- Font: Plus Jakarta Sans.
- Input/button radius: 8px; card radius: 16–32px; chip radius: pill.
- Shadow: natural and blue-tinted, never heavy black.

## Composition

- Auth pages use a desktop split screen: immersive sports image on the left, focused form on the right. Mobile removes the image panel.
- Landing page uses a full-bleed, four-scene sports hero with direct CTAs and slide controls. It continues with the facility marquee, image-led class list, membership plans, a three-up coach carousel, monochrome partner rail and an information-rich footer.
- Hero and coach stories auto-advance every 6 seconds, stop automatically for reduced-motion users, and always retain manual controls.
- Header and footer logos sit directly on their surfaces without a white card. Generated sports imagery is stored locally as compressed WebP assets.
- Controls have visible hover, active, focus, loading and error states.
