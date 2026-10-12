# Giao diện module Training (FR-47 → FR-53)

Điểm danh buổi học, giáo án, gán giáo án cho khóa 1-1, đánh giá tiến độ và trang "Kế hoạch & tiến độ" của Member. Mã nguồn nằm trong `src/features/training/`. Hợp đồng API do backend định nghĩa trong `Sportigo-BE-1/docs/training-api.md` (nhánh `feat/attendance-training-plan-progress`).

## 1. Màn hình

| Mã | Màn hình | Route | Role | API | FR |
|---|---|---|---|---|---|
| M1 | Widget "Giáo án hôm nay" (component, gắn vào Dashboard) | — | MEMBER | `GET /members/me/training` | 53 |
| M2 | Kế hoạch tập luyện | `/member/training-plan` | MEMBER | `GET /members/me/training` | 53 |
| M3 | Kết quả & Tiến độ | `/member/progress` | MEMBER | `GET /members/me/training`, `GET /attendance` | 53, 48 |
| C1 | Điểm danh buổi học | `/coach/sessions/:sessionId/attendance` | COACH | `GET`, `PUT /class-sessions/:id/attendance` | 47 |
| C2 | Điểm danh + lịch sử (Coach) | `/coach/attendance` | COACH | `GET /attendance`, *`GET /coaches/me/sessions`* | 48 |
| C2 | Lịch sử điểm danh (Manager) | `/manager/attendance` | CENTER_MANAGER | `GET /attendance` | 48 |
| C3 | Danh sách giáo án | `/coach/workout-plans` | COACH | `GET`, `POST /workout-plans`, `PATCH /workout-plans/:id`, `PATCH /workout-plans/:id/status`, *`GET /sports`* | 49 |
| C4 | Chi tiết giáo án | `/coach/workout-plans/:planId` | COACH | `GET /workout-plans/:id`, `POST`, `PATCH`, `DELETE /workout-plans/:id/items…`, `PATCH /workout-plans/:id/items/reorder` | 50 |
| C5 | Giáo án của khóa 1-1 | `/coach/private-enrollments/:enrollmentId/plans` | COACH | `GET`, `POST /private-enrollments/:id/plans`, `GET /workout-plans?status=ACTIVE&sportId=`, *`GET /coaches/me/trainees`* | 51 |
| C6 | Danh sách đánh giá | `/coach/assessments` | COACH | `GET /progress-assessments` | 52 |
| C6 | Ghi đánh giá | `/coach/assessments/new` | COACH | `POST /progress-assessments`, *`GET /coaches/me/trainees`* | 52 |

API in nghiêng là API **backend chưa có** (xem mục 3). Mọi route đều có `RequireRole`, nhưng backend vẫn là nơi kiểm tra quyền chính.

Menu đã thêm:
- **Navbar Member:** "Kế hoạch" (`/member/training-plan`) và "Tiến độ" (`/member/progress`). Dùng nhãn ngắn để 7 mục không tràn ngang ở màn 1161–1280px.
- **Sidebar Coach** (`coachNavigation`): Điểm danh, Giáo án, Đánh giá tiến độ.
- **Sidebar Manager:** Lịch sử điểm danh.

### Gắn widget M1 vào Dashboard Member

```tsx
import { TodayPlanWidget } from '../features/training/components/TodayPlanWidget';

// Trong JSX của trang Dashboard, đặt ở cột phù hợp:
<TodayPlanWidget />
```

Widget tự gọi API, tự xử lý loading, lỗi và trạng thái chưa có giáo án, nên không cần props. Widget chỉ chạy khi người dùng đăng nhập với role MEMBER.

## 2. Cấu trúc mã

```text
src/features/training/
├─ types.ts            # Kiểu dữ liệu khớp training-api.md
├─ api.ts              # Gọi API qua apiClient chung
├─ queryKeys.ts        # Khóa cache TanStack Query (dạng cây)
├─ hooks/              # useQuery/useMutation; mutation tự invalidate đúng nhánh
├─ errors.ts           # parseApiError: thông báo tiếng Việt, lỗi theo trường, nhận diện API chưa có
├─ format.ts           # Ngày giờ Asia/Ho_Chi_Minh (dd/MM/yyyy HH:mm), tuần/tháng
├─ labels.ts           # Nhãn tiếng Việt cho trạng thái, cấp độ, cường độ
├─ schemas.ts          # Zod cho form, giới hạn khớp backend
├─ planStructure.ts    # Nhóm mục Tuần → Buổi, tính tuần hiện tại
├─ components/ui/      # Nút, chip, card, dialog, trạng thái loading/empty/lỗi dùng chung trong module
├─ components/         # Component nghiệp vụ (widget, form, bảng lịch sử…)
└─ pages/              # Các màn hình trong bảng trên
```

Các file dùng chung đã được sửa (chỉ thêm, không đổi hành vi cũ):

| File | Thay đổi |
|---|---|
| `src/styles/index.css` | Thêm `@theme` tokens từ DESIGN.md. Chuyển rule `button, input { font: inherit }` và `:focus-visible` vào `@layer base` để utility Tailwind ghi đè được (Tailwind preflight đã có rule tương đương; đã so ảnh, trang đăng nhập giống hệt từng pixel). Thêm rule padding navbar trong dải 1161–1280px. |
| `src/app/providers.tsx` | Gắn `<Toaster />`. |
| `src/app/router.tsx` | Thêm route `/member/training-plan`, `/member/progress`, nhánh `/coach/*` và `/manager/attendance`. |
| `src/config/navigation.ts` | Thêm `coachNavigation` và mục Lịch sử điểm danh cho Manager. |
| `src/features/member/components/MemberNavbar.tsx` | Thêm 2 mục menu. |
| `src/components/auth/` | `RequireRole` và `session.ts`: tạm đọc role từ JWT cho tới khi có `GET /api/auth/me` (FR-04). |
| `src/components/feedback/` | `toast()` và `Toaster` dùng chung, không thêm thư viện. |
| `src/layouts/CoachLayout.tsx` | Layout Coach mới, tái dùng `Sidebar`; trên mobile sidebar thu vào nút menu. |
| `package.json` | Thêm `recharts` (biểu đồ, chỉ tải khi mở trang Tiến độ). |

## 3. API backend cần bổ sung

Khi chưa có các API dưới đây, giao diện hiện **"Chức năng chưa sẵn sàng"** kèm tên API, không dùng dữ liệu giả. FE đã gọi sẵn theo hợp đồng đề xuất: khi backend nhận 404 "route chưa tồn tại" thì hiện "chưa sẵn sàng"; khi backend bổ sung đúng hợp đồng thì màn hình tự hoạt động.

| Mã | API | Màn bị ảnh hưởng | Hợp đồng đề xuất |
|---|---|---|---|
| BE-1 | `GET /api/sports` (FR-12) | C3: chọn môn khi tạo giáo án, lọc theo môn | `[{ id, name, isActive }]` (FE nhận cả dạng `{ items }`) |
| BE-2 | `GET /api/coaches/me/sessions?from&to` | C2: khối "Buổi dạy cần điểm danh" là lối vào chính của C1 | `[{ id, startsAt, endsAt, status, class: { id, name, sport: { id, name } }, room: { code, name } \| null, confirmedCount, markedCount, isLocked }]` |
| BE-3 | `GET /api/coaches/me/trainees` (gần FR-11) | C6: chọn học viên và ngữ cảnh; C5: tên khóa, học viên, môn; nút "Gán cho khóa 1-1" ở C4 | `[{ member: { id, memberCode, displayName }, contexts: [{ type: 'GROUP_CLASS', classRegistrationId, name, sport } \| { type: 'PRIVATE_COURSE', privateEnrollmentId, name, sport, status }] }]` |
| BE-4 | `GET /api/users?role=MEMBER&search=` (FR-09), `GET /api/group-classes` (FR-21) | C2 Manager: bộ chọn học viên và lớp | Tạm thời bấm vào tên lớp/học viên trong bảng để lọc (`?classId=`, `?memberId=`). |
| BE-5 | Thêm `room { code, name }` vào `session` của `GET /class-sessions/:id/attendance` | C1: hiện phòng | FE đã hiển thị nếu trường này có. |
| BE-6 | Thêm `schedules [{ dayOfWeek, startTime, endTime }]` vào `enrollment` của `GET /members/me/training` | M1: biết buổi nào là "hôm nay" | Hiện M1 hiển thị tuần hiện tại và cho chọn buổi. |
| BE-7 | `GET /api/auth/me` (FR-04) | Route guard | Hiện tạm đọc role từ JWT. |

## 4. Đề xuất thêm dữ liệu backend (để bàn với nhóm)

Các ý tưởng trong ảnh mẫu Dashboard **chưa làm** vì backend chưa có dữ liệu:

- **Mức hoàn thành từng mục giáo án** (ví dụ "3/4 bước, 75%"): cần bảng ghi nhận Member/Coach đánh dấu hoàn thành. Hiện thanh tiến độ ở M1 chỉ thể hiện *vị trí tuần*, tính từ ngày bắt đầu khóa.
- **Kcal tiêu hao, chuỗi ngày tập, chỉ số InBody theo tuần**: chưa có nguồn dữ liệu.
- **Tỷ lệ chuyên cần chính xác hơn**: hiện tính bằng (Có mặt + Muộn) / *số buổi đã được điểm danh*. Muốn tính trên mọi buổi đã diễn ra thì backend cần trả thêm số buổi CONFIRMED đã kết thúc mà chưa điểm danh.
- **Tổng hợp điểm danh**: một endpoint `GET /api/attendance/summary?from&to` sẽ thay cho 3 request đếm `total` mà M3 đang dùng cho mỗi kỳ.
- **Kết thúc / thay thế giáo án đã gán**: chưa có API, nên Coach không gỡ được giáo án khỏi khóa 1-1.
- **Tách code theo route** (`React.lazy` trong `router.tsx`): bundle chính đã vượt 500 kB từ trước khi có module này. Nên làm chung cho cả nhóm vì router là file dùng chung.

## 5. Giả định đã áp dụng

- **FR-51:** giữ đúng hành vi backend hiện tại. Một khóa 1-1 có thể có nhiều giáo án; lỗi 409 chỉ xảy ra khi gán trùng chính giáo án đang dùng. Không có luồng "Thay thế giáo án" vì backend không có `replaceCurrent`. Giáo án đang gán được làm mờ trong danh sách chọn.
- **Trạng thái gán:** ACTIVE = "Đang áp dụng", COMPLETED = "Đã kết thúc". Backend không trả các bản gán CANCELLED cho Member.
- **Tuần hiện tại:** tính theo `startDate` của khóa 1-1 và giờ Việt Nam, với tuần = ⌊số ngày / 7⌋ + 1, giới hạn trong khoảng 1 đến `durationWeeks`.
- **Điểm danh:** chỉ gửi học viên đã chọn trạng thái. Nếu còn người chưa chọn, hệ thống hỏi xác nhận trước khi lưu. "Tất cả có mặt" đặt mọi học viên về Có mặt; Coach sửa riêng các trường hợp khác trước khi lưu.
- **Khóa điểm danh:** FE không biết giá trị `ATTENDANCE_EDIT_WINDOW_HOURS`, nên lý do khóa ghi chung là "đã quá thời hạn sửa".
- **Cường độ mục giáo án:** gợi ý LOW/MEDIUM/HIGH (Nhẹ/Vừa/Cao). Giá trị khác (backend cho phép chuỗi tự do) vẫn hiển thị nguyên văn.
- **Đánh giá:** khóa 1-1 chỉ chọn được khi ACTIVE/COMPLETED, theo đúng quy tắc backend. Tên chỉ số không được trùng nhau (không phân biệt hoa thường).
- **Thông báo lỗi:** ưu tiên message của backend nếu là tiếng Việt. Lỗi validate mặc định của zod (tiếng Anh) được thay bằng "Giá trị không hợp lệ."

## 6. Câu hỏi cần nhóm xác nhận

1. Ai làm BE-2 và BE-3? Hai API này thuộc phạm vi FR-11/FR-17, nhưng module Training cần ngay. Có thể đặt trong module Training nếu nhóm đồng ý.
2. Sau đăng nhập, Coach và Member nên vào trang nào? Hiện `LoginPage` luôn chuyển về `/dashboard` (khu Manager).
3. Các path trong `centerManagerNavigation` (`/members`, `/staff`…) thiếu tiền tố `/app`, nên bấm vào sẽ không khớp route. Chủ sidebar Manager kiểm tra giúp.
4. Seed gốc của backend tạo `manager@sportcenter.local` nhưng chưa xác minh email, nên tài khoản này không đăng nhập được (`EMAIL_NOT_VERIFIED`). Nên đặt `emailVerifiedAt` trong seed.
5. Có cần cho Member xem lịch sử điểm danh của buổi 1-1 không? Hiện FR-47 chỉ điểm danh lớp nhóm (xem BR-30 trong training-api.md mục 10).

## 7. Chạy thử end-to-end với backend local

1. Backend (`Sportigo-BE-1`, nhánh `feat/attendance-training-plan-progress`): `npm ci`, rồi `npx prisma migrate deploy`, rồi `npm run db:seed`, rồi `npm run dev`. Chạy seed ngay trước khi demo để có "buổi đang diễn ra".
2. Frontend: tạo `.env` từ `.env.example` (`VITE_API_URL=http://localhost:3000/api`), rồi `npm ci`, rồi `npm run dev`. Mở **http://localhost:5173**. Phải dùng `localhost`, không dùng `127.0.0.1`, vì CORS backend chỉ cho `localhost:5173`.
3. Đăng nhập (mật khẩu demo `ChangeMe123!`). Trang đăng nhập hiện chuyển về `/dashboard`; gõ thẳng URL bên dưới để vào khu của role.
   - **Coach** `coach.demo@sportcenter.local`:
     - `/coach/attendance`: bấm thời gian buổi học, hoặc mở `/coach/sessions/<id buổi đang diễn ra>/attendance` (ID in ra khi chạy seed). Chọn trạng thái rồi lưu (FR-47). Mở buổi sắp tới để thấy chế độ chỉ xem.
     - `/coach/workout-plans`: mở giáo án demo, thêm/sửa/sắp xếp mục, thử thêm mục trùng thứ tự để thấy lỗi 409 tại ô "Thứ tự" (FR-49, FR-50).
     - `/coach/private-enrollments/<id enrollment>/plans`: gán giáo án demo (FR-51).
     - `/coach/assessments`: xem đánh giá. Form `/new` chờ BE-3 (FR-52).
   - **Member** `member1.demo@sportcenter.local`: `/member/training-plan` (FR-53) và `/member/progress` (FR-53, FR-48).
   - **Manager** `manager@sportcenter.local`: `/manager/attendance` (FR-48). Cần xác minh email trước, xem câu hỏi 4.

## 8. Kiểm thử tự động

`npm test` chạy Vitest + Testing Library. Các test của module:

- `dataLayer.test.ts`: ngày giờ theo giờ VN, nhóm Tuần → Buổi, tuần hiện tại, đọc lỗi API.
- `components/TodayPlanWidget.test.tsx`: empty state, bỏ qua giáo án đã kết thúc, chuyển buổi.
- `pages/SessionAttendancePage.test.tsx`: một lần PUT với đúng payload, xác nhận khi lưu thiếu, 409 chuyển sang chỉ xem, 422 đánh dấu đúng học viên.
- `components/AssessmentForm.test.tsx`: chỉ một ngữ cảnh, lọc ngữ cảnh theo học viên, không chọn ngày tương lai, 403 hiện tại ô ngữ cảnh.
