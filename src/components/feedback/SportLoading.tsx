import { PersonSimpleSwim } from '@phosphor-icons/react';

type SportLoadingProps = {
  title?: string;
  description?: string;
  fullPage?: boolean;
};

/** Loading state mang bản sắc Sportigo, dùng chung cho route và các trang dữ liệu lớn. */
export function SportLoading({
  title = 'Đang chuẩn bị trải nghiệm của bạn',
  description = 'Sportigo đang đồng bộ lịch tập mới nhất.',
  fullPage = false,
}: SportLoadingProps) {
  return (
    <section className={`sport-loading ${fullPage ? 'sport-loading--page' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <div className="sport-loading__pool" aria-hidden="true">
        <div className="sport-loading__swim-lane">
          <span className="sport-loading__swimmer">
            <PersonSimpleSwim weight="fill" />
          </span>
          <span className="sport-loading__wake" />
        </div>
        <span className="sport-loading__wave sport-loading__wave--near" />
        <span className="sport-loading__wave sport-loading__wave--far" />
      </div>
      <div className="sport-loading__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </section>
  );
}
