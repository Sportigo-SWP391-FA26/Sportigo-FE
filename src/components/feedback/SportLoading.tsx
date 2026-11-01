import { Barbell, Basketball, PersonSimpleRun, TennisBall } from '@phosphor-icons/react';

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
      <div className="sport-loading__arena" aria-hidden="true">
        <div className="sport-loading__lane">
          <span className="sport-loading__runner"><PersonSimpleRun weight="fill" /></span>
          <span className="sport-loading__finish" />
        </div>
        <div className="sport-loading__sports">
          <span><Basketball weight="fill" /></span>
          <span><TennisBall weight="fill" /></span>
          <span><Barbell weight="bold" /></span>
        </div>
      </div>
      <div className="sport-loading__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="sport-loading__skeleton" aria-hidden="true"><span /><span /><span /></div>
    </section>
  );
}
