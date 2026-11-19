import {
  ArrowRight,
  BookOpenText,
  CalendarBlank,
  CalendarDots,
  CurrencyCircleDollar,
  FunnelSimple,
  User,
  UsersThree,
} from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSessionRole } from '../../../components/auth/session';
import { Button } from '../../../components/ui/Button';
import { DateInput } from '../../../components/ui/LocalizedInputs';
import { EmptyState, ErrorState, ListSkeleton } from '../../../components/ui/States';
import { getSports } from '../../training/api';
import { parseApiError } from '../../training/errors';
import { formatDate } from '../../training/format';
import { trainingKeys } from '../../training/queryKeys';
import { usePublicClasses } from '../bookingHooks';
import { isClassBookable } from '../bookingEligibility';
import type { PublicClassFilters } from '../bookingTypes';
import { sportImageUrl } from '../sportImages';
import { usePrivateCourses } from '../../private-courses/hooks/usePrivateCourses';

const PAGE_SIZE = 10;
const currency = new Intl.NumberFormat('vi-VN');

export function ClassSchedulePage({ receptionistMode = false }: { receptionistMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = !receptionistMode && searchParams.get('type') === 'private' ? 'private' : 'group';
  const role = getSessionRole();
  const sports = useQuery({ queryKey: trainingKeys.sports(), queryFn: getSports, retry: false });
  const [sportId, setSportId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [date, setDate] = useState('');
  const [filters, setFilters] = useState<PublicClassFilters>({ page: 1, limit: PAGE_SIZE });
  const classes = usePublicClasses(filters);
  const privateCourses = usePrivateCourses(view === 'private');
  // API đã lọc ở server; lớp bảo vệ này ngăn cache cũ hiện lớp đã bắt đầu.
  const items = (classes.data?.data ?? []).filter((item) => isClassBookable(item));
  const coachOptions = [...new Map(items.map((item) => [item.coachId, item.coach.user.displayName])).entries()];
  const openSeats = items.reduce((total, item) => total + Math.max(item.capacity - item._count.registrations, 0), 0);

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      ...(sportId ? { sportId: Number(sportId) } : {}),
      ...(coachId ? { coachId: Number(coachId) } : {}),
      ...(date ? { date } : {}),
    });
  };
  const setPage = (page: number) => setFilters((current) => ({ ...current, page }));

  return (
    <div className={`class-catalog ${receptionistMode ? 'class-catalog--staff' : ''}`}>
      <section className="class-catalog__hero">
        <img src="/images/landing/hero/badminton.webp" alt="Sân cầu lông trong nhà Sportigo" />
        <div className="class-catalog__hero-shade" />
        <div className="class-catalog__hero-content">
          <h1>{receptionistMode ? 'Đăng ký lớp cho hội viên' : 'Chọn cách bạn muốn chuyển động'}</h1>
          <p>{receptionistMode ? 'Tra cứu lớp đang mở và hỗ trợ hội viên hoàn tất đăng ký ngay tại quầy.' : 'Tham gia lớp nhóm giàu năng lượng hoặc tập trung vào mục tiêu riêng cùng Coach trong khóa 1–1.'}</p>
          <div className="class-catalog__stats" aria-label="Tổng quan lớp học">
            {view === 'group' ? <>
              <div><strong>{classes.data?.pagination.total ?? 0}</strong><span>Lớp nhóm đang mở</span></div>
              <div><strong>{openSeats}</strong><span>Chỗ còn lại trên trang</span></div>
              <div><strong>{coachOptions.length}</strong><span>Coach đang giảng dạy</span></div>
            </> : <>
              <div><strong>{privateCourses.data?.length ?? 0}</strong><span>Khóa 1–1 khả dụng</span></div>
              <div><strong>{privateCourses.data?.reduce((total, course) => total + course.totalSessions, 0) ?? 0}</strong><span>Buổi học trong lộ trình</span></div>
              <div><strong>{privateCourses.data?.reduce((total, course) => total + course.coaches.length, 0) ?? 0}</strong><span>Lựa chọn Coach</span></div>
            </>}
          </div>
        </div>
      </section>

      <form className={`class-catalog__filters ${view === 'private' ? 'is-private' : ''}`} onSubmit={applyFilters}>
        {!receptionistMode && <div className="class-catalog__tabs" role="tablist" aria-label="Loại hình tập luyện">
          <button type="button" role="tab" aria-selected={view === 'group'} className={view === 'group' ? 'is-active' : ''} onClick={() => setSearchParams({})}>
            <UsersThree aria-hidden="true" /><span><strong>Lớp nhóm</strong><small>Tập theo lịch chung, cùng cộng đồng</small></span>
          </button>
          <button type="button" role="tab" aria-selected={view === 'private'} className={view === 'private' ? 'is-active' : ''} onClick={() => setSearchParams({ type: 'private' })}>
            <User aria-hidden="true" /><span><strong>Khóa 1–1</strong><small>Lộ trình riêng cùng Coach</small></span>
          </button>
        </div>}
        {view === 'group' && <><div className="class-catalog__filter-heading">
          <FunnelSimple aria-hidden="true" />
          <div><strong>Tìm lớp phù hợp</strong><span>Lọc theo môn, Coach hoặc ngày học</span></div>
        </div>
        <label>Môn thể thao
          <select value={sportId} onChange={(event) => setSportId(event.target.value)} disabled={sports.isPending || sports.isError}>
            <option value="">Tất cả môn</option>
            {sports.data?.filter((sport) => sport.isActive).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}</option>)}
          </select>
        </label>
        <label>Coach
          <select value={coachId} onChange={(event) => setCoachId(event.target.value)}>
            <option value="">Tất cả Coach</option>
            {coachOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <label>Ngày lớp diễn ra
          <DateInput value={date} onValueChange={setDate} aria-label="Chọn ngày" />
        </label>
        <Button type="submit" icon={<FunnelSimple aria-hidden="true" />}>Lọc lớp</Button></>}
        {view === 'group' && sports.isError && <p role="alert" className="class-catalog__filter-error">Không tải được danh sách môn: {parseApiError(sports.error).message}</p>}
      </form>

      <section className="class-catalog__results" aria-labelledby="class-results-title">
        <header className="class-catalog__results-heading">
          <div><span>{view === 'group' ? 'Lớp đang tuyển sinh' : 'Huấn luyện cá nhân'}</span><h2 id="class-results-title">{view === 'group' ? 'Chọn lớp. Bắt đầu chuyển động.' : 'Một Coach. Một mục tiêu. Một lộ trình.'}</h2></div>
          {view === 'group' && classes.data && <p>{classes.data.pagination.total} kết quả</p>}
          {view === 'private' && privateCourses.data && <p>{privateCourses.data.length} khóa học</p>}
        </header>

        {view === 'private' ? (
          privateCourses.isPending ? <ListSkeleton label="Đang tải khóa 1–1…" />
            : privateCourses.isError ? <ErrorState error={privateCourses.error} onRetry={() => privateCourses.refetch()} retrying={privateCourses.isRefetching} pendingApi="GET /api/private-courses" />
              : privateCourses.data.length === 0 ? <EmptyState icon={<BookOpenText />} title="Chưa có khóa 1–1 đang mở" description="Hiện chưa có khóa học cá nhân nào khả dụng." />
                : <div className="class-catalog__grid">{privateCourses.data.map((course) => (
                  <article className="class-course-card class-course-card--private" key={course.id}>
                    <div className="class-course-card__media">
                      <img src={sportImageUrl(course.sport)} alt={`Khóa 1–1 ${course.name} · ${course.sport.name}`} loading="lazy" />
                      <span className="class-course-card__sport">{course.sport.name}</span>
                      <span className="class-course-card__status">Đang nhận học viên</span>
                    </div>
                    <div className="class-course-card__body">
                      <div className="class-course-card__title-row">
                        <div><p>Khóa huấn luyện 1–1</p><h3>{course.name}</h3></div>
                        <strong>{currency.format(Number(course.price))}<small>₫</small></strong>
                      </div>
                      {course.description && <p className="class-course-card__description">{course.description}</p>}
                      <div className="class-course-card__meta">
                        <div><User aria-hidden="true" /><span><small>Coach khả dụng</small>{course.coaches.length} lựa chọn</span></div>
                        <div><CalendarDots aria-hidden="true" /><span><small>Số buổi</small>{course.totalSessions} buổi</span></div>
                        <div><UsersThree aria-hidden="true" /><span><small>Hình thức</small>Huấn luyện cá nhân</span></div>
                        <div><CurrencyCircleDollar aria-hidden="true" /><span><small>Thời lượng</small>{course.sessionDurationMinutes} phút/buổi</span></div>
                      </div>
                      <div className="class-course-card__footer">
                        <span>Lịch học tuần cố định được thống nhất cùng Coach.</span>
                        <Link to={`/member/private-courses/${course.id}`}>Xem khóa học<ArrowRight aria-hidden="true" /></Link>
                      </div>
                    </div>
                  </article>
                ))}</div>
        ) : classes.isPending ? (
          <ListSkeleton label="Đang tải lớp học…" />
        ) : classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => classes.refetch()} retrying={classes.isRefetching} pendingApi="GET /api/bookings/classes" />
        ) : items.length === 0 ? (
          <EmptyState icon={<CalendarBlank />} title="Không tìm thấy lớp phù hợp" description="Thử bỏ bớt bộ lọc hoặc chọn một ngày khác." />
        ) : (
          <>
            <div className="class-catalog__grid">
              {items.map((item) => {
                const confirmed = item._count.registrations;
                const remaining = Math.max(item.capacity - confirmed, 0);
                const occupancy = Math.min(Math.round((confirmed / Math.max(item.capacity, 1)) * 100), 100);
                const nearlyFull = remaining > 0 && occupancy >= 75;
                const full = remaining === 0;
                return (
                  <article className="class-course-card" key={item.id}>
                    <div className="class-course-card__media">
                      <img src={sportImageUrl(item.sport)} alt={`Lớp ${item.name} · ${item.sport.name}`} loading="lazy" />
                      <span className="class-course-card__sport">{item.sport.name}</span>
                      <span className={`class-course-card__status ${full ? 'is-full' : nearlyFull ? 'is-limited' : ''}`}>{full ? 'Đã đủ chỗ' : nearlyFull ? `Chỉ còn ${remaining} chỗ` : 'Đang mở đăng ký'}</span>
                    </div>
                    <div className="class-course-card__body">
                      <div className="class-course-card__title-row">
                        <div><p>Chương trình lớp nhóm</p><h3>{item.name}</h3></div>
                        <strong>{currency.format(Number(item.tuitionFee))}<small>₫</small></strong>
                      </div>
                      {item.description && <p className="class-course-card__description">{item.description}</p>}
                      <div className="class-course-card__meta">
                        <div><User aria-hidden="true" /><span><small>Coach</small>{item.coach.user.displayName}</span></div>
                        <div><CalendarDots aria-hidden="true" /><span><small>Thời gian khóa</small>{formatDate(item.startDate)} – {formatDate(item.endDate)}</span></div>
                        <div><UsersThree aria-hidden="true" /><span><small>Sĩ số</small>{confirmed}/{item.capacity} học viên</span></div>
                        <div><CurrencyCircleDollar aria-hidden="true" /><span><small>Hình thức</small>Thanh toán theo khóa</span></div>
                      </div>
                      <div className="class-course-card__capacity">
                        <div><span>Mức độ lấp đầy</span><strong>{occupancy}%</strong></div>
                        <span><i style={{ width: `${occupancy}%` }} /></span>
                      </div>
                      <div className="class-course-card__footer">
                        <span>{full ? 'Bạn có thể xem thông tin và chờ đợt mở tiếp theo.' : `Còn ${remaining} vị trí cho lớp này.`}</span>
                        <Link to={`${receptionistMode ? '/app/class-bookings' : '/member/classes'}/${item.id}`}>{receptionistMode ? 'Đăng ký hộ' : 'Xem chi tiết'}<ArrowRight aria-hidden="true" /></Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <nav className="class-catalog__pagination" aria-label="Phân trang lớp học">
              <p>Trang <strong>{classes.data.pagination.page}</strong> / {Math.max(classes.data.pagination.totalPages, 1)}</p>
              <div>
                <Button variant="secondary" size="sm" disabled={classes.data.pagination.page <= 1 || classes.isFetching} onClick={() => setPage(classes.data.pagination.page - 1)}>Trang trước</Button>
                <Button variant="secondary" size="sm" disabled={classes.data.pagination.page >= classes.data.pagination.totalPages || classes.isFetching} onClick={() => setPage(classes.data.pagination.page + 1)}>Trang sau</Button>
              </div>
            </nav>
          </>
        )}
        {role && role !== 'MEMBER' && !receptionistMode && <p className="class-catalog__role-note">Tài khoản hiện tại không phải Member; đăng ký lớp chỉ dành cho Member.</p>}
      </section>
    </div>
  );
}
