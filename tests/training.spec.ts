// Kiểm thử end-to-end module Training (FR-47 → FR-53) dưới góc nhìn người dùng cuối.
// Cần backend local đã seed (npm run db:seed) và frontend chạy ở cổng 5173.
// Chạy: npx playwright test tests/training.spec.ts --workers=1
//   (máy chưa cài Chromium của Playwright có thể dùng Edge: PW_CHANNEL=msedge)
import { expect, test as base, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const APP = process.env.E2E_APP_URL ?? 'http://localhost:5173';
const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api';
const PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe123!';

const ACCOUNTS = {
  member1: 'member1.demo@sportcenter.local',
  member2: 'member2.demo@sportcenter.local',
  coach: 'coach.demo@sportcenter.local',
  manager: 'manager@sportcenter.local',
} as const;
type Account = keyof typeof ACCOUNTS;

// ID lấy từ bảng in ra khi chạy npm run db:seed ở backend
const SEED = {
  ongoingSessionId: Number(process.env.E2E_ONGOING_SESSION_ID ?? 1),
  upcomingSessionId: Number(process.env.E2E_UPCOMING_SESSION_ID ?? 2),
  enrollmentId: Number(process.env.E2E_ENROLLMENT_ID ?? 1),
  sportId: 1,
  className: 'Bơi cơ bản – lớp demo Training',
  demoPlanName: 'Bơi ếch nền tảng 4 tuần (demo)',
  member1: { id: 3, name: 'Trần Thị Bình' },
  member2: { id: 4, name: 'Phạm Minh Đức' },
};

// Giáo án riêng cho kiểm thử, không đụng vào giáo án demo
const E2E_PLAN = '[E2E] Giáo án kiểm thử';

const CENTER_TZ = 'Asia/Ho_Chi_Minh';

// CORS của backend chỉ cho phép localhost:5173 nên dùng localhost thay vì 127.0.0.1
base.use({
  baseURL: APP,
  locale: 'vi-VN',
  timezoneId: CENTER_TZ,
  ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
});

// Mỗi test tự kiểm tra: không có lỗi JavaScript và không có response 5xx
const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('pageerror', (error) => problems.push(`Lỗi JS: ${error.message}`));
      page.on('response', (response) => {
        if (response.status() >= 500) problems.push(`HTTP ${response.status()} ${response.url()}`);
      });
      await use(problems);
      expect(problems, 'Trang không được có lỗi JS hoặc lỗi 5xx').toEqual([]);
    },
    { auto: true },
  ],
});

// ---------- Tiện ích ----------

const tokens = new Map<Account, string>();

async function tokenFor(request: APIRequestContext, account: Account) {
  if (!tokens.has(account)) {
    const response = await request.post(`${API}/auth/login`, {
      data: { identifier: ACCOUNTS[account], password: PASSWORD },
    });
    expect(response.ok(), `Đăng nhập ${ACCOUNTS[account]}: ${await response.text()}`).toBeTruthy();
    tokens.set(account, (await response.json()).accessToken);
  }
  return tokens.get(account)!;
}

async function api<T = unknown>(request: APIRequestContext, account: Account, method: string, path: string, data?: unknown) {
  const response = await request.fetch(`${API}${path}`, {
    method,
    data,
    headers: { Authorization: `Bearer ${await tokenFor(request, account)}` },
  });
  const body = (await response.json().catch(() => null)) as T;
  return { status: response.status(), body };
}

/** Đăng nhập bằng token (bỏ qua form) để vào thẳng màn cần kiểm thử */
async function signIn(page: Page, request: APIRequestContext, account: Account) {
  const token = await tokenFor(request, account);
  await page.addInitScript((value) => localStorage.setItem('accessToken', value), token);
}

async function newPageAs(browser: Browser, request: APIRequestContext, account: Account | null) {
  const context = await browser.newContext({ baseURL: APP, locale: 'vi-VN', timezoneId: CENTER_TZ });
  const page = await context.newPage();
  if (account) await signIn(page, request, account);
  return page;
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

function toast(page: Page, text: string | RegExp) {
  return page.getByRole('status').filter({ hasText: text });
}

/** Đợi response GET /attendance có tham số lọc tương ứng rồi chờ React vẽ xong */
async function waitForAttendance(page: Page, query: string) {
  await page.waitForResponse((response) => response.url().includes('/api/attendance?') && response.url().includes(query));
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
}

function attendanceGroup(page: Page, memberName: string) {
  return page.getByRole('group', { name: `Trạng thái của ${memberName}` });
}

async function chooseStatus(page: Page, memberName: string, label: string) {
  const group = attendanceGroup(page, memberName);
  await group.locator('label', { hasText: label }).click();
  await expect(group.getByRole('radio', { name: label })).toBeChecked();
}

function centerMonthRange() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: CENTER_TZ }).format(new Date());
  const [year, month] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return {
    month,
    today,
    from: new Date(`${prefix}-01T00:00:00.000+07:00`).toISOString(),
    to: new Date(`${prefix}-${lastDay}T23:59:59.999+07:00`).toISOString(),
  };
}

type Paginated<T> = { items: T[]; total: number };
type AttendanceRow = { id: number; status: string; registrationId: number; member: { id: number; displayName: string }; note: string | null };
type Plan = { id: number; name: string; status: string; itemCount: number; items?: { id: number; title: string; itemOrder: number }[] };
type Assignment = { id: number; status: string; workoutPlan: { id: number; name: string } };

// Bỏ qua toàn bộ khi chưa bật backend local
base.beforeAll(async ({ request }) => {
  const healthy = await request
    .get(API.replace(/\/api$/, '/health'))
    .then((response) => response.ok())
    .catch(() => false);
  base.skip(!healthy, `Cần backend local tại ${API} (npm run db:seed && npm run dev)`);
});

// =====================================================================
// A. Đăng nhập và phân quyền giao diện
// =====================================================================

test.describe('A. Đăng nhập và phân quyền', () => {
  test('A1 · Member đăng nhập bằng form rồi mở được trang của mình', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/Nhập SĐT hoặc Email/).fill(ACCOUNTS.member1);
    await page.getByPlaceholder(/Nhập mật khẩu/).fill(PASSWORD);
    await page.getByRole('button', { name: /Đăng nhập vào hệ thống/ }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    test.info().annotations.push({ type: 'Ghi nhận', description: `Sau đăng nhập, Member được chuyển tới ${new URL(page.url()).pathname}` });
    expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeTruthy();

    await page.goto('/member/training-plan');
    await expect(page.getByRole('heading', { name: 'Kế hoạch tập luyện', level: 1 })).toBeVisible();
  });

  test('A2 · Chưa đăng nhập thì bị chuyển về trang đăng nhập', async ({ page }) => {
    for (const path of ['/member/training-plan', '/member/progress', '/coach/attendance', '/coach/workout-plans', '/manager/attendance']) {
      await page.goto(path);
      await expect(page, `Mở ${path} khi chưa đăng nhập`).toHaveURL(/\/login$/);
    }
  });

  test('A3 · Sai role bị chuyển về trang của role đó kèm thông báo (FR-04, BR-06)', async ({ browser, request }) => {
    const cases: [Account, string, RegExp][] = [
      ['member1', '/coach/workout-plans', /\/member\/home$/],
      ['member1', '/manager/attendance', /\/member\/home$/],
      ['coach', '/member/progress', /\/coach\/attendance$/],
      ['coach', '/manager/attendance', /\/coach\/attendance$/],
      ['manager', '/coach/attendance', /\/app\/dashboard$/],
    ];
    for (const [account, path, expected] of cases) {
      const page = await newPageAs(browser, request, account);
      await page.goto(path);
      await expect(page, `${account} mở ${path}`).toHaveURL(expected);
      await expect(page.getByText('Bạn không có quyền truy cập trang này.')).toBeVisible();
      await page.context().close();
    }
  });
});

// =====================================================================
// B. Member: Kế hoạch tập luyện, Kết quả & Tiến độ (FR-53, FR-48)
// =====================================================================

test.describe('B. Member', () => {
  test('B1 · FR-53: xem giáo án được gán theo Tuần → Buổi, chỉ đọc', async ({ page, request }) => {
    await signIn(page, request, 'member1');
    await page.goto('/member/training-plan');
    await page.getByRole('link', { name: new RegExp(SEED.demoPlanName.replace(/[()]/g, '\\$&')) }).click();
    await expect(page).toHaveURL(/assignment=\d+/);
    await expect(page.getByRole('heading', { name: SEED.demoPlanName, level: 2 })).toBeVisible();

    // Tuần hiện tại được đánh dấu và mở sẵn
    await expect(page.getByText('Tuần này').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Tuần 1/, expanded: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Khởi động/, level: 4 })).toBeVisible();
    await expect(page.getByText('Buổi 2').first()).toBeVisible();

    // Bấm chip Tuần 2 → mở tuần 2 (giáo án demo chưa có nội dung tuần 2)
    await page.getByRole('navigation', { name: 'Chọn tuần' }).getByRole('button', { name: /^Tuần 2/ }).click();
    await expect(page.getByRole('button', { name: /^Tuần 2/, expanded: true })).toBeVisible();
    await expect(page.getByText('Coach chưa thêm nội dung cho tuần này.').first()).toBeVisible();

    // Chỉ đọc: không có nút sửa/xóa/thêm
    await expect(page.getByRole('button', { name: /^(Sửa|Xóa|Thêm)/ })).toHaveCount(0);
  });

  test('B2 · FR-53: Member chưa được gán giáo án thấy hướng dẫn liên hệ Coach', async ({ page, request }) => {
    const training = await api<{ planAssignments: unknown[] }>(request, 'member2', 'GET', '/members/me/training');
    test.skip(training.body.planAssignments.length > 0, 'Member 2 đã có giáo án trong dữ liệu hiện tại');
    await signIn(page, request, 'member2');
    await page.goto('/member/training-plan');
    await expect(page.getByText('Bạn chưa được gán giáo án. Hãy liên hệ Coach phụ trách khóa 1-1.')).toBeVisible();
  });

  test('B3 · FR-53, FR-48: số liệu chuyên cần khớp dữ liệu điểm danh thật', async ({ page, request }) => {
    const range = centerMonthRange();
    const all = await api<Paginated<AttendanceRow>>(request, 'member1', 'GET', `/attendance?from=${range.from}&to=${range.to}&pageSize=100`);
    const attended = all.body.items.filter((item) => item.status === 'PRESENT' || item.status === 'LATE').length;

    await signIn(page, request, 'member1');
    await page.goto('/member/progress');
    const monthLabel = page.getByText(`Buổi tham gia tháng ${range.month}`, { exact: true });
    await expect(monthLabel.locator('xpath=following-sibling::p[1]')).toHaveText(String(attended));
    if (all.body.total > 0) {
      await expect(page.getByText(`Trên ${all.body.total} buổi đã được điểm danh`).first()).toBeVisible();
      const rate = `${Math.round((attended / all.body.total) * 100)}%`;
      await expect(page.getByText('Chuyên cần tháng này', { exact: true }).locator('xpath=following-sibling::p[1]')).toHaveText(rate);
    }
  });

  test('B4 · FR-53: biểu đồ xu hướng, xem dạng bảng và đổi chỉ số', async ({ page, request }) => {
    await signIn(page, request, 'member1');
    await page.goto('/member/progress');
    await expect(page.getByRole('heading', { name: 'Nhận xét gần nhất' })).toBeVisible();

    const metric = page.getByRole('combobox', { name: 'Chỉ số' });
    await expect(metric).toBeVisible();
    await expect(page.getByRole('img', { name: /^Biểu đồ/ })).toBeVisible();

    await page.getByRole('button', { name: 'Xem dạng bảng' }).click();
    const table = page.locator('table', { has: page.locator('caption') });
    await expect(table).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBeGreaterThan(0);

    const options = await metric.locator('option').allTextContents();
    if (options.length > 1) {
      const second = await metric.locator('option').nth(1).getAttribute('value');
      await metric.selectOption(second!);
      const label = second === '__score__' ? 'Điểm tổng' : second!;
      await expect(page.getByRole('heading', { name: `Xu hướng: ${label}` })).toBeVisible();
    }
  });

  test('B5 · FR-48: lịch sử điểm danh có lọc, xóa lọc và báo lỗi khoảng ngày', async ({ page, request }) => {
    await signIn(page, request, 'member1');
    await page.goto('/member/progress');

    // Tabs dùng được bằng bàn phím
    await page.getByRole('tab', { name: 'Đánh giá tiến độ' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Lịch sử điểm danh' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/tab=attendance/);

    // Member không có cột học viên
    await expect(page.getByRole('columnheader', { name: 'Học viên' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Tháng này' }).click();
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-01/);
    // Trong lúc tải, bảng giữ dữ liệu cũ (làm mờ) nên phải đợi response của bộ lọc mới
    await Promise.all([
      waitForAttendance(page, 'status=ABSENT'),
      page.getByRole('combobox', { name: 'Trạng thái' }).selectOption('ABSENT'),
    ]);
    await expect(page).toHaveURL(/status=ABSENT/);
    const rows = page.locator('table tbody tr');
    const empty = page.getByText('Không có buổi điểm danh phù hợp');
    await expect(rows.first().or(empty)).toBeVisible();
    for (const text of await rows.allTextContents()) expect(text).toContain('Vắng');

    await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click();
    await expect(page).not.toHaveURL(/status=/);

    await page.getByLabel('Từ ngày').fill('2026-10-20');
    await page.getByLabel('Đến ngày').fill('2026-10-01');
    await expect(page.getByText('Đến ngày phải bằng hoặc sau Từ ngày.').first()).toBeVisible();
  });

  test('B6 · FR-48: Member chỉ thấy điểm danh của chính mình', async ({ page, request }) => {
    for (const [account, member] of [['member1', SEED.member1], ['member2', SEED.member2]] as const) {
      const history = await api<Paginated<AttendanceRow>>(request, account, 'GET', '/attendance?pageSize=100');
      expect(history.body.items.every((item) => item.member.id === member.id), `${account} chỉ thấy bản ghi của mình`).toBe(true);
    }
    const own = await api<Paginated<AttendanceRow>>(request, 'member1', 'GET', '/attendance?pageSize=20');
    await signIn(page, request, 'member1');
    await page.goto('/member/progress?tab=attendance');
    if (own.body.total === 0) {
      await expect(page.getByText('Không có buổi điểm danh phù hợp')).toBeVisible();
    } else {
      await expect(page.locator('table tbody tr')).toHaveCount(Math.min(own.body.total, 20));
      await expect(page.getByText(`trên ${own.body.total} kết quả`)).toBeVisible();
    }
  });

  test('B7 · FR-53: Member không đọc được giáo án khóa 1-1 của người khác', async ({ request }) => {
    expect((await api(request, 'member1', 'GET', `/private-enrollments/${SEED.enrollmentId}/plans`)).status).toBe(200);
    expect((await api(request, 'member2', 'GET', `/private-enrollments/${SEED.enrollmentId}/plans`)).status).toBe(403);
  });

  test('B8 · Navbar Member trên điện thoại mở được Kế hoạch và Tiến độ', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request, 'member1');
    await page.goto('/member/progress');
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await page.getByRole('link', { name: 'Kế hoạch' }).click();
    await expect(page).toHaveURL(/\/member\/training-plan/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});

// =====================================================================
// C. Coach: điểm danh buổi học (FR-47, BR-42, BR-43)
// =====================================================================

test.describe('C. Coach – điểm danh buổi học', () => {
  test.describe.configure({ mode: 'serial' });
  const sessionPath = `/coach/sessions/${SEED.ongoingSessionId}/attendance`;

  test('C1 · FR-47 / BR-43: chọn đủ 4 trạng thái, lưu, ghi lặp chỉ cập nhật bản ghi cũ', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(sessionPath);
    await expect(page.getByRole('heading', { name: SEED.className, level: 1 })).toBeVisible();
    await expect(page.getByText('Đang mở điểm danh')).toBeVisible();

    // Cả 4 trạng thái đều chọn được
    for (const label of ['Có mặt', 'Muộn', 'Vắng', 'Có phép']) await chooseStatus(page, SEED.member2.name, label);

    await page.getByRole('button', { name: 'Tất cả có mặt' }).click();
    await expect(attendanceGroup(page, SEED.member1.name).getByRole('radio', { name: 'Có mặt' })).toBeChecked();
    await chooseStatus(page, SEED.member2.name, 'Vắng');
    await page.getByRole('button', { name: 'Lưu điểm danh' }).click();
    await expect(toast(page, 'Đã lưu điểm danh cho 2 học viên.')).toBeVisible();

    const first = await api<Paginated<AttendanceRow>>(request, 'coach', 'GET', `/attendance?sessionId=${SEED.ongoingSessionId}`);
    expect(first.body.total).toBe(2);
    const duc = first.body.items.find((item) => item.member.id === SEED.member2.id)!;
    expect(duc.status).toBe('ABSENT');

    // Ghi lặp: đổi sang Muộn kèm ghi chú → vẫn 2 bản ghi, cùng id
    await chooseStatus(page, SEED.member2.name, 'Muộn');
    const row = attendanceGroup(page, SEED.member2.name).locator('xpath=ancestor::li[1]');
    const note = row.getByLabel(`Ghi chú cho ${SEED.member2.name}`);
    if (!(await note.isVisible())) await row.getByRole('button', { name: /Thêm ghi chú/ }).click();
    await note.fill('Đến muộn 10 phút');
    await page.getByRole('button', { name: 'Lưu điểm danh' }).click();
    await expect(toast(page, 'Đã lưu điểm danh cho 2 học viên.')).toBeVisible();

    const second = await api<Paginated<AttendanceRow>>(request, 'coach', 'GET', `/attendance?sessionId=${SEED.ongoingSessionId}`);
    expect(second.body.total, 'Không tạo bản ghi trùng (BR-43)').toBe(2);
    const ducAgain = second.body.items.find((item) => item.member.id === SEED.member2.id)!;
    expect(ducAgain).toMatchObject({ id: duc.id, status: 'LATE', note: 'Đến muộn 10 phút' });

    // Tải lại trang vẫn thấy trạng thái đã lưu
    await page.reload();
    await expect(attendanceGroup(page, SEED.member2.name).getByRole('radio', { name: 'Muộn' })).toBeChecked();
    await expect(page.getByLabel(`Ghi chú cho ${SEED.member2.name}`)).toHaveValue('Đến muộn 10 phút');
  });

  test('C2 · BR-42: chỉ học viên CONFIRMED được điểm danh; registration lạ bị từ chối', async ({ page, request }) => {
    const roster = await api<{ students: { registrationId: number }[] }>(request, 'coach', 'GET', `/class-sessions/${SEED.ongoingSessionId}/attendance`);
    await signIn(page, request, 'coach');
    await page.goto(sessionPath);
    await expect(page.getByRole('group', { name: /^Trạng thái của / })).toHaveCount(roster.body.students.length);

    const rejected = await api<{ code: string; details: { invalidRegistrationIds: number[] } }>(
      request,
      'coach',
      'PUT',
      `/class-sessions/${SEED.ongoingSessionId}/attendance`,
      { records: [{ classRegistrationId: 999999, status: 'PRESENT' }] },
    );
    expect(rejected.status).toBe(422);
    expect(rejected.body).toMatchObject({ code: 'REGISTRATION_NOT_ELIGIBLE', details: { invalidRegistrationIds: [999999] } });
  });

  test('C3 · BR-43: buổi chưa bắt đầu chỉ được xem', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(`/coach/sessions/${SEED.upcomingSessionId}/attendance`);
    await expect(page.getByText(/Buổi học chưa bắt đầu/)).toBeVisible();
    await expect(page.getByText('Đã khóa')).toBeVisible();
    await expect(attendanceGroup(page, SEED.member1.name).getByRole('radio', { name: 'Có mặt' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Lưu điểm danh' })).toHaveCount(0);
  });

  test('C4 · Cảnh báo khi rời trang lúc chưa lưu', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(sessionPath);
    await chooseStatus(page, SEED.member1.name, 'Có phép');

    await page.getByRole('link', { name: 'Giáo án', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Rời trang khi chưa lưu?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
    await expect(page).toHaveURL(new RegExp(`${sessionPath}$`));
    await expect(attendanceGroup(page, SEED.member1.name).getByRole('radio', { name: 'Có phép' })).toBeChecked();

    await page.getByRole('link', { name: 'Giáo án', exact: true }).click();
    await page.getByRole('dialog', { name: 'Rời trang khi chưa lưu?' }).getByRole('button', { name: 'Rời trang' }).click();
    await expect(page).toHaveURL(/\/coach\/workout-plans$/);
  });

  test('C5 · Buổi học không tồn tại báo không tìm thấy', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto('/coach/sessions/999999/attendance');
    await expect(page.getByText('Không tìm thấy dữ liệu')).toBeVisible();
  });

  test('C6 · Dùng tốt trên điện thoại: vùng bấm ≥ 44px, không cuộn ngang, nút Lưu luôn trong tầm tay', async ({ page, request }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, request, 'coach');
    await page.goto(sessionPath);
    await expect(attendanceGroup(page, SEED.member1.name)).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    for (const label of await page.getByRole('group', { name: /^Trạng thái của / }).locator('label').all()) {
      expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    const save = page.getByRole('button', { name: 'Lưu điểm danh' });
    await page.evaluate(() => window.scrollTo(0, 0));
    const box = (await save.boundingBox())!;
    expect(box.y + box.height, 'Nút Lưu nằm trong màn hình nhờ thanh dính đáy').toBeLessThanOrEqual(844);
  });
});

// =====================================================================
// D. Lịch sử điểm danh Coach và Manager (FR-48)
// =====================================================================

test.describe('D. Lịch sử điểm danh', () => {
  test('D1 · FR-48: Coach lọc theo lớp và mở lại màn điểm danh', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto('/coach/attendance');
    // Khối "Buổi dạy cần điểm danh" chờ API BE-2
    await expect(page.getByText('Chức năng chưa sẵn sàng')).toBeVisible();
    await expect(page.getByText('GET /api/coaches/me/sessions').first()).toBeVisible();

    await page.getByRole('button', { name: `Lọc theo lớp ${SEED.className}` }).first().click();
    await expect(page).toHaveURL(/classId=\d+/);
    await expect(page.getByText(`Lớp: ${SEED.className}`)).toBeVisible();
    await page.getByRole('button', { name: `Bỏ lọc Lớp: ${SEED.className}` }).click();
    await expect(page).not.toHaveURL(/classId=/);

    await page.locator('table tbody tr').first().getByRole('link').click();
    await expect(page).toHaveURL(/\/coach\/sessions\/\d+\/attendance$/);
  });

  test('D2 · FR-48: Manager xem toàn trung tâm, lọc theo học viên và trạng thái', async ({ page, request }) => {
    await signIn(page, request, 'manager');
    await page.goto('/manager/attendance');
    await expect(page.getByRole('columnheader', { name: 'Học viên' })).toBeVisible();

    await Promise.all([
      waitForAttendance(page, `memberId=${SEED.member2.id}`),
      page.getByRole('button', { name: `Lọc theo học viên ${SEED.member2.name}` }).first().click(),
    ]);
    await expect(page).toHaveURL(new RegExp(`memberId=${SEED.member2.id}`));
    await expect(page.getByText(`Học viên: ${SEED.member2.name}`)).toBeVisible();
    for (const text of await page.locator('table tbody tr').allTextContents()) expect(text).toContain(SEED.member2.name);

    await Promise.all([
      waitForAttendance(page, 'status=LATE'),
      page.getByRole('combobox', { name: 'Trạng thái' }).selectOption('LATE'),
    ]);
    await expect(page.locator('table tbody tr').first().or(page.getByText('Không có buổi điểm danh phù hợp'))).toBeVisible();
    for (const text of await page.locator('table tbody tr').allTextContents()) expect(text).toContain('Muộn');

    await page.getByRole('button', { name: 'Xóa bộ lọc' }).first().click();
    await expect(page).not.toHaveURL(/memberId=|status=/);
  });
});

// =====================================================================
// E. Coach: giáo án (FR-49, FR-50, BR-45) và F. gán giáo án (FR-51, BR-44)
// =====================================================================

test.describe('E–F. Coach – giáo án và gán cho khóa 1-1', () => {
  test.describe.configure({ mode: 'serial' });
  let planId = 0;

  // Chuẩn bị giáo án kiểm thử: Nháp, chưa có mục. Tạo qua API vì màn tạo mới đang chờ GET /api/sports.
  test.beforeAll(async ({ request }) => {
    const found = await api<Paginated<Plan>>(request, 'coach', 'GET', `/workout-plans?search=${encodeURIComponent('[E2E]')}&pageSize=100`);
    const existing = found.body.items.find((plan) => plan.name === E2E_PLAN);
    if (existing) {
      planId = existing.id;
    } else {
      const created = await api<Plan>(request, 'coach', 'POST', '/workout-plans', {
        sportId: SEED.sportId,
        name: E2E_PLAN,
        level: 'BEGINNER',
        durationWeeks: 2,
        description: 'Tạo tự động bởi tests/training.spec.ts',
      });
      expect(created.status).toBe(201);
      planId = created.body.id;
    }
    expect((await api(request, 'coach', 'PATCH', `/workout-plans/${planId}/status`, { status: 'DRAFT' })).status).toBe(200);
    const detail = await api<Plan>(request, 'coach', 'GET', `/workout-plans/${planId}`);
    for (const item of detail.body.items ?? []) {
      expect((await api(request, 'coach', 'DELETE', `/workout-plans/${planId}/items/${item.id}`)).status).toBe(204);
    }
    const reset = await api(request, 'coach', 'PATCH', `/workout-plans/${planId}`, {
      durationWeeks: 2,
      description: 'Tạo tự động bởi tests/training.spec.ts',
    });
    expect(reset.status).toBe(200);
  });

  test('E1 · FR-49: danh sách giáo án có tìm kiếm và lọc trạng thái', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto('/coach/workout-plans');
    await expect(page.getByRole('link', { name: SEED.demoPlanName })).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Tìm kiếm' });
    await search.fill('khong-co-giao-an-nay');
    await expect(page.getByText('Không có giáo án phù hợp')).toBeVisible();
    await search.fill('[E2E]');
    await expect(page.getByRole('link', { name: E2E_PLAN })).toBeVisible();
    await expect(page.getByRole('link', { name: SEED.demoPlanName })).toHaveCount(0);
    await search.fill('');

    await page.getByRole('group', { name: 'Trạng thái' }).locator('label', { hasText: 'Nháp' }).click();
    await expect(page).toHaveURL(/status=DRAFT/);
    await expect(page.getByRole('link', { name: E2E_PLAN })).toBeVisible();
    await expect(page.getByRole('link', { name: SEED.demoPlanName })).toHaveCount(0);
  });

  test('E2 · FR-49: tạo giáo án mới — CHỜ API GET /api/sports', async ({ page, request }) => {
    test.info().annotations.push({ type: 'Bị chặn', description: 'Chưa có GET /api/sports nên chưa chọn được môn' });
    await signIn(page, request, 'coach');
    await page.goto('/coach/workout-plans');
    await page.getByRole('button', { name: 'Tạo giáo án' }).click();
    const dialog = page.getByRole('dialog', { name: 'Tạo giáo án' });
    await expect(dialog.getByText('Chưa thể tạo giáo án mới vì danh sách môn chưa sẵn sàng.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Tạo giáo án' })).toBeDisabled();
  });

  test('E3 · FR-49: không kích hoạt được giáo án chưa có mục', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(`/coach/workout-plans/${planId}`);
    await page.getByRole('button', { name: 'Đổi trạng thái', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đổi trạng thái giáo án' });
    await expect(dialog.getByRole('radio', { name: 'Đang dùng' })).toBeChecked();
    await expect(dialog.getByText('Giáo án chưa có mục nào')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Kích hoạt' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
  });

  test('E4 · FR-50 / BR-45: thêm, sửa, sắp thứ tự bằng bàn phím, chặn trùng thứ tự và tuần vượt thời lượng', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(`/coach/workout-plans/${planId}`);

    await page.getByRole('button', { name: 'Thêm mục đầu tiên' }).click();
    let dialog = page.getByRole('dialog', { name: 'Thêm mục giáo án' });
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Khởi động');
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill('Đi bộ dưới nước 5 phút');
    await dialog.getByRole('spinbutton', { name: 'Thời lượng (phút)' }).fill('10');
    await dialog.getByRole('combobox', { name: 'Cường độ' }).selectOption('LOW');
    await dialog.getByRole('button', { name: 'Thêm mục' }).click();
    await expect(toast(page, 'Đã thêm "Khởi động"')).toBeVisible();

    const session1 = page.getByRole('region', { name: /^Buổi 1/ });
    await session1.getByRole('button', { name: 'Thêm mục' }).click();
    dialog = page.getByRole('dialog', { name: 'Thêm mục giáo án' });
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Thả lỏng');
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill('Bơi nhẹ, giãn cơ');
    await dialog.getByRole('spinbutton', { name: 'Số hiệp' }).fill('3');
    await dialog.getByRole('spinbutton', { name: 'Số lần' }).fill('10');
    await dialog.getByRole('button', { name: 'Thêm mục' }).click();
    await expect(toast(page, 'Đã thêm "Thả lỏng"')).toBeVisible();
    await expect(session1.getByRole('heading', { level: 4 })).toHaveText(['1. Khởi động', '2. Thả lỏng']);

    // BR-45: trùng thứ tự trong cùng tuần/buổi → lỗi 409 tại ô Thứ tự
    await session1.getByRole('button', { name: 'Thêm mục' }).click();
    dialog = page.getByRole('dialog', { name: 'Thêm mục giáo án' });
    await dialog.getByRole('spinbutton', { name: 'Thứ tự' }).fill('1');
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Mục trùng thứ tự');
    await dialog.getByRole('textbox', { name: 'Nội dung' }).fill('Phải bị từ chối');
    await dialog.getByRole('button', { name: 'Thêm mục' }).click();
    await expect(dialog.getByText('Thứ tự mục giáo án bị trùng.')).toBeVisible();
    await expect(dialog.getByRole('spinbutton', { name: 'Thứ tự' })).toHaveAttribute('aria-invalid', 'true');

    // Tuần vượt thời lượng giáo án (2 tuần)
    await dialog.getByRole('spinbutton', { name: 'Thứ tự' }).fill('');
    await dialog.getByRole('spinbutton', { name: 'Tuần' }).fill('3');
    await dialog.getByRole('button', { name: 'Thêm mục' }).click();
    await expect(dialog.getByText('Giáo án chỉ có 2 tuần')).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy' }).click();

    // Sửa mục
    await page.getByRole('button', { name: 'Sửa "Thả lỏng"' }).click();
    dialog = page.getByRole('dialog', { name: 'Sửa mục giáo án' });
    await dialog.getByRole('textbox', { name: 'Tiêu đề' }).fill('Thả lỏng nhẹ');
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page, 'Đã cập nhật mục giáo án.')).toBeVisible();

    // Sắp thứ tự bằng bàn phím; focus đi theo mục vừa chuyển
    await page.getByRole('button', { name: 'Đưa "Thả lỏng nhẹ" lên' }).focus();
    await page.keyboard.press('Enter');
    await expect(session1.getByRole('heading', { level: 4 })).toHaveText(['1. Thả lỏng nhẹ', '2. Khởi động']);
    await expect(page.getByRole('button', { name: 'Đưa "Thả lỏng nhẹ" xuống' })).toBeFocused();
    await expect.poll(async () => {
      const detail = await api<Plan>(request, 'coach', 'GET', `/workout-plans/${planId}`);
      return detail.body.items?.map((item) => item.title);
    }).toEqual(['Thả lỏng nhẹ', 'Khởi động']);
  });

  test('E5 · FR-49: kích hoạt và sửa thông tin giáo án', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(`/coach/workout-plans/${planId}`);
    await page.getByRole('button', { name: 'Đổi trạng thái', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Đổi trạng thái giáo án' });
    await dialog.getByRole('button', { name: 'Kích hoạt' }).click();
    await expect(toast(page, /sang Đang dùng/)).toBeVisible();
    await expect(page.getByText('Đang dùng').first()).toBeVisible();

    await page.getByRole('button', { name: 'Sửa thông tin' }).click();
    const form = page.getByRole('dialog', { name: 'Sửa thông tin giáo án' });
    await form.getByRole('textbox', { name: 'Mô tả' }).fill('Giáo án kiểm thử tự động, 2 tuần');
    await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(toast(page, 'Đã cập nhật giáo án.')).toBeVisible();
    await expect(page.getByText('Giáo án kiểm thử tự động, 2 tuần')).toBeVisible();
  });

  test('E6 · FR-50: xóa mục, chặn xóa mục cuối của giáo án đang dùng', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto(`/coach/workout-plans/${planId}`);
    await page.getByRole('button', { name: 'Xóa "Khởi động"' }).click();
    let dialog = page.getByRole('dialog', { name: 'Xóa mục giáo án?' });
    await dialog.getByRole('button', { name: 'Xóa mục' }).click();
    await expect(toast(page, 'Đã xóa "Khởi động"')).toBeVisible();
    // Đợi danh sách tải lại (itemCount mới) rồi mới thử xóa mục cuối
    await expect(page.getByRole('button', { name: 'Xóa "Khởi động"' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Xóa "Thả lỏng nhẹ"' }).click();
    dialog = page.getByRole('dialog', { name: 'Xóa mục giáo án?' });
    await expect(dialog.getByText(/Đây là mục cuối cùng của giáo án đang dùng/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Xóa mục' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Hủy' }).click();
  });

  test('F1 · FR-51 / BR-44: gán giáo án Đang dùng cùng môn cho khóa 1-1', async ({ page, request }) => {
    const before = await api<Assignment[]>(request, 'coach', 'GET', `/private-enrollments/${SEED.enrollmentId}/plans`);
    const alreadyAssigned = before.body.some((assignment) => assignment.workoutPlan.id === planId && assignment.status === 'ACTIVE');

    await signIn(page, request, 'coach');
    await page.goto(`/coach/private-enrollments/${SEED.enrollmentId}/plans`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Gán giáo án' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Gán giáo án cho khóa 1-1' });
    await expect(dialog.getByText('Giáo án Đang dùng của môn Bơi lội.')).toBeVisible();

    // Giáo án đang gán không chọn lại được (tránh 409 PLAN_ALREADY_ASSIGNED)
    await expect(dialog.getByRole('radio', { name: new RegExp(SEED.demoPlanName.replace(/[()]/g, '\\$&')) })).toBeDisabled();

    const e2eRadio = dialog.getByRole('radio', { name: new RegExp(E2E_PLAN.replace(/[[\]]/g, '\\$&')) });
    if (alreadyAssigned) {
      test.info().annotations.push({ type: 'Ghi nhận', description: 'Giáo án kiểm thử đã được gán từ lần chạy trước' });
      await expect(e2eRadio).toBeDisabled();
      await dialog.getByRole('button', { name: 'Hủy' }).click();
    } else {
      await dialog.locator('label', { hasText: E2E_PLAN }).click();
      await dialog.getByRole('button', { name: 'Gán giáo án' }).click();
      await expect(toast(page, `Đã gán "${E2E_PLAN}"`)).toBeVisible();
    }
    await expect(page.getByRole('link', { name: E2E_PLAN })).toBeVisible();
  });

  test('F2 · BR-44: backend từ chối giáo án chưa kích hoạt và khóa 1-1 không tồn tại', async ({ request }) => {
    expect((await api(request, 'coach', 'PATCH', `/workout-plans/${planId}/status`, { status: 'DRAFT' })).status).toBe(200);
    const notActive = await api<{ code: string }>(request, 'coach', 'POST', `/private-enrollments/${SEED.enrollmentId}/plans`, { workoutPlanId: planId });
    expect(notActive.status).toBe(422);
    expect(notActive.body.code).toBe('PLAN_NOT_ASSIGNABLE');
    expect((await api(request, 'coach', 'PATCH', `/workout-plans/${planId}/status`, { status: 'ACTIVE' })).status).toBe(200);
    expect((await api(request, 'coach', 'POST', '/private-enrollments/999999/plans', { workoutPlanId: planId })).status).toBe(404);
  });

  test('F3 · FR-51 → FR-53: Member thấy giáo án vừa được gán', async ({ page, request }) => {
    await signIn(page, request, 'member1');
    await page.goto('/member/training-plan');
    await expect(page.getByRole('link', { name: new RegExp(E2E_PLAN.replace(/[[\]]/g, '\\$&')) })).toBeVisible();
  });
});

// =====================================================================
// G. Coach: đánh giá tiến độ (FR-52, BR-46)
// =====================================================================

// Giả lập RIÊNG API GET /api/coaches/me/trainees (BE-3 chưa có) bằng ID thật của dữ liệu seed.
// Việc ghi đánh giá vẫn gọi backend thật.
async function mockTrainees(page: Page, trainees: unknown) {
  await page.route('**/api/coaches/me/trainees', (route) => route.fulfill({ json: trainees }));
}

const swim = { id: SEED.sportId, name: 'Bơi lội' };

test.describe('G. Coach – đánh giá tiến độ', () => {
  test('G1 · FR-52: danh sách mới nhất trước và lọc theo học viên', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto('/coach/assessments');
    const dates = await page.locator('ol > li article header p:first-child').allTextContents();
    test.skip(dates.length < 2, 'Cần ít nhất 2 đánh giá');
    const toTime = (text: string) => {
      const [day, month, year] = text.slice(0, 10).split('/').map(Number);
      return Date.UTC(year, month - 1, day);
    };
    expect(toTime(dates[0])).toBeGreaterThanOrEqual(toTime(dates[1]));

    await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/progress-assessments?`) && response.url().includes(`memberId=${SEED.member1.id}`)),
      page.getByRole('button', { name: `Chỉ xem ${SEED.member1.name}` }).first().click(),
    ]);
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`memberId=${SEED.member1.id}`));
    await expect(page.getByText(`Học viên: ${SEED.member1.name}`)).toBeVisible();
    for (const text of await page.locator('ol > li article').allTextContents()) expect(text).toContain(SEED.member1.name);
  });

  test('G2 · FR-52: form ghi đánh giá — CHỜ API GET /api/coaches/me/trainees', async ({ page, request }) => {
    test.info().annotations.push({ type: 'Bị chặn', description: 'Chưa có GET /api/coaches/me/trainees để chọn học viên' });
    await signIn(page, request, 'coach');
    await page.goto('/coach/assessments/new');
    await expect(page.getByText('Chức năng chưa sẵn sàng')).toBeVisible();
    await expect(page.getByText('GET /api/coaches/me/trainees')).toBeVisible();
  });

  test('G3 · FR-52: ghi đánh giá lớp nhóm (giả lập danh sách học viên, lưu vào backend thật)', async ({ page, request }) => {
    const comment = `Kiểm thử E2E ${Date.now()}: phối hợp tay chân tốt hơn.`;
    await mockTrainees(page, [
      {
        member: { id: SEED.member2.id, memberCode: 'MEM-DEMO-02', displayName: SEED.member2.name },
        contexts: [{ type: 'GROUP_CLASS', classRegistrationId: 2, name: SEED.className, sport: swim }],
      },
    ]);
    await signIn(page, request, 'coach');
    await page.goto('/coach/assessments/new');

    await page.getByRole('combobox', { name: 'Học viên' }).selectOption(String(SEED.member2.id));
    await page.locator('label', { hasText: SEED.className }).click();
    const date = page.getByLabel(/^Ngày đánh giá\s*\*?$/);
    await expect(date).toHaveAttribute('max', centerMonthRange().today);
    await page.getByRole('textbox', { name: 'Nhận xét' }).fill(comment);
    await page.getByRole('button', { name: 'Kỹ thuật (1–10)' }).click();
    await page.getByLabel('Giá trị chỉ số 1').fill('7');
    await page.getByRole('button', { name: 'Lưu đánh giá' }).click();

    await expect(toast(page, `Đã lưu đánh giá cho ${SEED.member2.name}.`)).toBeVisible();
    await expect(page).toHaveURL(/\/coach\/assessments$/);
    await expect(page.getByText(comment)).toBeVisible();
    const saved = await api<Paginated<{ coachComment: string; context: { type: string } }>>(
      request,
      'coach',
      'GET',
      `/progress-assessments?memberId=${SEED.member2.id}&pageSize=100`,
    );
    expect(saved.body.items.find((item) => item.coachComment === comment)?.context.type).toBe('GROUP_CLASS');
  });

  test('G4 · BR-46: đánh giá sai ngữ cảnh (khóa 1-1 không thuộc học viên) bị từ chối tại ô Ngữ cảnh', async ({ page, request }) => {
    await mockTrainees(page, [
      {
        member: { id: SEED.member2.id, memberCode: 'MEM-DEMO-02', displayName: SEED.member2.name },
        // Khóa 1-1 này thuộc Member 1, không phải Member 2
        contexts: [{ type: 'PRIVATE_COURSE', privateEnrollmentId: SEED.enrollmentId, name: 'Bơi 1-1 – 12 buổi (demo)', sport: swim, status: 'ACTIVE' }],
      },
    ]);
    await signIn(page, request, 'coach');
    await page.goto('/coach/assessments/new');
    await page.getByRole('combobox', { name: 'Học viên' }).selectOption(String(SEED.member2.id));
    await page.locator('label', { hasText: 'Bơi 1-1' }).click();
    await page.getByRole('textbox', { name: 'Nhận xét' }).fill('Phải bị từ chối');
    await page.getByLabel('Tên chỉ số 1').fill('Sức bền (1–10)');
    await page.getByLabel('Giá trị chỉ số 1').fill('5');
    await page.getByRole('button', { name: 'Lưu đánh giá' }).click();
    await expect(page.locator('[id$="-context-error"]')).toHaveText('Coach không phụ trách học viên hoặc ngữ cảnh đánh giá không hợp lệ.');
    await expect(page).toHaveURL(/\/coach\/assessments\/new$/);
  });
});

// =====================================================================
// I. Trạng thái lỗi người dùng hay gặp
// =====================================================================

test.describe('I. Trạng thái lỗi', () => {
  test('I1 · Mất kết nối: báo lỗi dễ hiểu và nút Thử lại tải lại được', async ({ page, request }) => {
    await signIn(page, request, 'member1');
    await page.route('**/api/members/me/training', (route) => route.abort('internetdisconnected'));
    await page.goto('/member/training-plan');
    await expect(page.getByText('Không tải được dữ liệu')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')).toBeVisible();

    await page.unroute('**/api/members/me/training');
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByRole('link', { name: new RegExp(SEED.demoPlanName.replace(/[()]/g, '\\$&')) })).toBeVisible();
  });

  test('I2 · Hết phiên đăng nhập: yêu cầu đăng nhập lại thay vì hiện lỗi kỹ thuật', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.route('**/api/workout-plans?*', (route) => route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED', message: 'Bạn cần đăng nhập để tiếp tục' } }));
    await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 401, json: { code: 'MISSING_REFRESH_TOKEN', message: 'Không tìm thấy phiên đăng nhập' } }));
    await page.goto('/coach/workout-plans');
    await expect(page.getByText('Cần đăng nhập lại')).toBeVisible();
    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

// =====================================================================
// H. Hiển thị trên nhiều kích thước màn hình
// =====================================================================

test.describe('H. Responsive', () => {
  const pages: [Account, string][] = [
    ['member1', '/member/training-plan'],
    ['member1', '/member/progress'],
    ['member1', '/member/progress?tab=attendance'],
    ['coach', '/coach/attendance'],
    ['coach', `/coach/sessions/${SEED.ongoingSessionId}/attendance`],
    ['coach', '/coach/workout-plans'],
    ['coach', '/coach/workout-plans/1'],
    ['coach', `/coach/private-enrollments/${SEED.enrollmentId}/plans`],
    ['coach', '/coach/assessments'],
    ['coach', '/coach/assessments/new'],
    ['manager', '/manager/attendance'],
  ];

  for (const width of [390, 768, 1366]) {
    test(`H · Không cuộn ngang ở độ rộng ${width}px`, async ({ browser, request }) => {
      const failures: string[] = [];
      for (const [account, path] of pages) {
        const page = await newPageAs(browser, request, account);
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path, { waitUntil: 'networkidle' });
        const overflow = await horizontalOverflow(page);
        if (overflow > 0) failures.push(`${path} (${account}) tràn ${overflow}px`);
        await page.context().close();
      }
      expect(failures).toEqual([]);
    });
  }
});
