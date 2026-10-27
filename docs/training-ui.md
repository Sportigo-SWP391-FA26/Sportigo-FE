# Giao diện module Training (FR-47 → FR-53)

Điểm danh buổi học, giáo án, gán giáo án cho khóa 1-1, đánh giá tiến độ và trang "Kế hoạch & tiến độ" của Member. Mã nguồn nằm trong `src/features/training/`. Hợp đồng API do backend định nghĩa trong `Sportigo-BE-1/docs/training-api.md` (nhánh `feat/attendance-training-plan-progress`).

## 1. Màn hình

| Mã | Màn hình | Route | Role | API | FR |
|---|---|---|---|---|---|
| M1 | Widget "Giáo án hôm nay" (component, gắn vào Dashboard) | — | MEMBER | `GET /members/me/training` | 53 |
| M2 | Kế hoạch tập luyện | `/member/training-plan` | MEMBER | `GET /members/me/training` | 53 |
| M3 | Kết quả & Tiến độ | `/member/progress` | MEMBER | `GET /members/me/training`, `GET /attendance` | 53, 48 |
| C1 | Điểm danh buổi học | `/coach/sessions/:sessionId/attendance` | COACH | `GET`, `PUT /class-sessions/:id/attendance` | 47 |
| C2 | Điểm danh + lịch sử (Coach) | `/coach/attendance` | COACH | `GET /attendance`, `GET /coaches/me/members`, `GET /group-classes/:id/sessions`, `GET /class-sessions/:id/attendance` | 47, 48 |
| C2 | Lịch sử điểm danh (Manager) | `/manager/attendance` | CENTER_MANAGER | `GET /attendance` | 48 |
| C3 | Danh sách giáo án | `/coach/workout-plans` | COACH | `GET`, `POST /workout-plans`, `PATCH /workout-plans/:id`, `PATCH /workout-plans/:id/status`, *`GET /sports`* | 49 |
| C4 | Chi tiết giáo án | `/coach/workout-plans/:planId` | COACH | `GET /workout-plans/:id`, `POST`, `PATCH`, `DELETE /workout-plans/:id/items…`, `PATCH /workout-plans/:id/items/reorder` | 50 |
| C5 | Giáo án của khóa 1-1 | `/coach/private-enrollments/:enrollmentId/plans` | COACH | `GET`, `POST /private-enrollments/:id/plans`, `GET /workout-plans?status=ACTIVE&sportId=`, `GET /private-courses/enrollments` | 51 |
| C6 | Danh sách đánh giá | `/coach/assessments` | COACH | `GET /progress-assessments` | 52 |
| C6 | Ghi đánh giá | `/coach/assessments/new` | COACH | `POST /progress-assessments`, `GET /private-courses/enrollments` (khóa 1-1), *học viên lớp nhóm (BE-3)* | 52 |

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
| BE-1 | `GET /api/sports` (FR-12) | C3: chọn môn khi tạo giáo án, lọc theo môn | **Đã có** trên `develop` (module Bộ môn), trả `{ success, data: [...] }`. FE đọc được cả dạng này, mảng thuần và `{ items }`. |
| BE-2 | Buổi dạy của Coach | C2: khối "Buổi dạy cần điểm danh" là lối vào chính của C1 | **Đã làm ở FE, không cần API mới** (backlog không có FR cho API này). FE ghép: `GET /coaches/me/members?type=CLASS` (FR-11) lấy lớp → `GET /group-classes/:id/sessions` (FR-17) lấy buổi hôm qua và hôm nay → `GET /class-sessions/:id/attendance` (FR-47) lấy sĩ số, số đã điểm danh, trạng thái khóa. Lớp chưa có học viên nào sẽ không hiện (không có ai để điểm danh). |
| BE-3 | Học viên Coach phụ trách (gần FR-11) | C6: chọn học viên và ngữ cảnh; C5: tên khóa, học viên, môn; nút "Gán cho khóa 1-1" ở C4 | **Khóa 1-1 đã nối** qua `GET /api/private-courses/enrollments` (backend tự lọc theo Coach), FE gom thành danh sách học viên. **Còn thiếu:** học viên lớp nhóm của Coach (`GROUP_CLASS`), và tên học viên trong API khóa 1-1 (hiện chỉ có `memberCode`; FE đọc `member.user.displayName` nếu backend bổ sung). |
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
     - `/coach/assessments`: xem đánh giá. Form `/new` ghi được đánh giá cho khóa 1-1; ngữ cảnh lớp nhóm chờ BE-3 (FR-52).
   - **Member** `member1.demo@sportcenter.local`: `/member/training-plan` (FR-53) và `/member/progress` (FR-53, FR-48).
   - **Manager** `manager@sportcenter.local`: `/manager/attendance` (FR-48). Cần xác minh email trước, xem câu hỏi 4.

## 8. Kiểm thử tự động

### Kiểm thử end-to-end (người dùng cuối)

`tests/training.spec.ts` gồm 37 kịch bản Playwright đi qua giao diện thật với backend thật, đặt tên theo FR/BR và cột "Test / Demo Scenario" của backlog:

| Nhóm | Nội dung |
|---|---|
| A | Đăng nhập bằng form; chưa đăng nhập bị chuyển về `/login`; sai role bị chuyển về trang của role (FR-04, BR-06) |
| B | Member: giáo án theo Tuần → Buổi (chỉ đọc), số liệu chuyên cần khớp API, biểu đồ và chế độ xem bảng, lọc lịch sử, chỉ thấy dữ liệu của mình (FR-53, FR-48) |
| C | Coach điểm danh: đủ 4 trạng thái, ghi lặp không tạo bản ghi trùng, buổi chưa bắt đầu chỉ được xem, cảnh báo rời trang, dùng trên điện thoại (FR-47, BR-42, BR-43) |
| D | Lịch sử điểm danh của Coach và Manager, lọc theo lớp/học viên/trạng thái (FR-48) |
| E–F | Giáo án: tìm kiếm/lọc, chặn kích hoạt khi chưa có mục, thêm/sửa/sắp thứ tự/xóa mục, trùng thứ tự; gán cho khóa 1-1 (FR-49 → FR-51, BR-44, BR-45) |
| G | Đánh giá tiến độ: danh sách, lọc, ghi đánh giá và từ chối sai ngữ cảnh (FR-52, BR-46) |
| I | Mất kết nối có nút Thử lại; hết phiên thì yêu cầu đăng nhập lại |
| H | Không cuộn ngang ở 390 / 768 / 1366 px trên 11 màn hình |

Cách chạy:

1. Backend: `npm run db:seed` rồi `npm run dev`. Frontend: `npm run dev -- --host 127.0.0.1`.
2. `npx playwright test tests/training.spec.ts --workers=1`
   - Máy chưa cài Chromium của Playwright: chạy `npx playwright install chromium`, hoặc dùng Edge có sẵn bằng `PW_CHANNEL=msedge` (PowerShell: `$env:PW_CHANNEL='msedge'`).
   - Không bật backend thì toàn bộ test tự bỏ qua.
3. Xem báo cáo: `npx playwright show-report`.

Lưu ý:

- **Tạo giáo án và form đánh giá chạy với API thật:** E2 tạo giáo án qua form (môn lấy từ `GET /api/sports`) rồi chuyển giáo án vừa tạo sang Ngừng. G2 và G3 dùng danh sách khóa 1-1 thật của Coach. Riêng G4 **giả lập** `GET /api/private-courses/enrollments` để dựng ngữ cảnh sai; việc ghi đánh giá vẫn gọi backend thật.
- **Dữ liệu do test tạo ra trong DB local:**
  - Giáo án `[E2E] Giáo án kiểm thử`, gán cho khóa 1-1 demo. Giáo án này được tái sử dụng, không tạo thêm ở các lần chạy sau.
  - Mỗi lần chạy thêm một đánh giá có nhận xét bắt đầu bằng "Kiểm thử E2E" cho Member 1 (khóa 1-1 demo).
  - Mỗi lần chạy thêm một giáo án `[E2E] Tạo từ form …` ở trạng thái Ngừng (backend không xóa cứng giáo án).
  - Điểm danh buổi đang diễn ra được đặt lại thành Có mặt / Muộn.
- **Phải dùng `localhost`:** test mở `http://localhost:5173` vì CORS của backend chỉ cho phép `localhost`. `baseURL` mặc định trong `playwright.config.ts` là `127.0.0.1`, nên các test khác có gọi API cũng cần lưu ý điều này.

## 5. Quản lý Coach, lớp nhóm và khóa học 1–1

| Màn hình | Route | Role | API |
|---|---|---|---|
| Danh sách/hồ sơ Coach, chuyên môn và availability | `/app/coaches`, `/app/coaches/:coachId` | CENTER_MANAGER | `GET /staff?role=COACH`, `/coaches/:id/sports`, `/sports`, `/coaches/:id/availability`; POST/DELETE sports, POST/PUT/DELETE availability |
| Lịch Coach tổng hợp | `/coach/schedule`, trong hồ sơ Coach Manager | COACH xem chính mình; CENTER_MANAGER chọn Coach | `GET /coaches/:id/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| Danh sách/chi tiết và các buổi lớp nhóm | `/app/classes`, `/app/classes/:classId` | CENTER_MANAGER | `GET`, `POST /group-classes`, `PATCH /group-classes/:id`, `PATCH /group-classes/:id/status`, `GET /group-classes/:id/sessions`, `POST /group-classes/:id/sessions`, `POST /group-classes/:id/sessions/recurring`, `POST /class-sessions/:id/change`, `POST /class-sessions/:id/cancel` |
| Danh sách/chi tiết khóa 1–1 | `/member/private-courses`, `/member/private-courses/:courseId`; `/app/private-courses`, `/app/private-courses/:courseId` | MEMBER, CENTER_MANAGER | `GET /private-courses`, `GET /private-courses/:id` |
| Lịch occurrence khóa 1–1 của Member | `/member/my-schedule` | MEMBER sở hữu enrollment | `GET /private-courses/enrollments`, `PATCH /private-courses/enrollments/:id/schedules/:scheduleId/occurrences/:sessionDate` |
| Tìm lớp nhóm | `/member/classes` | Khách xem; MEMBER đăng ký từ chi tiết | `GET /bookings/classes`, `GET /sports` |
| Chi tiết/đăng ký lớp nhóm | `/member/classes/:classId` | Khách xem; MEMBER đăng ký | `GET /bookings/classes/:id`, `POST /bookings/classes/:id/register` |
| Waitlist, hủy đăng ký vừa tạo và đăng ký hộ | `/member/classes/:classId`, `/app/class-bookings`, `/app/class-bookings/:classId` | MEMBER vào waitlist/hủy đăng ký của mình; RECEPTIONIST tạo/hủy đăng ký hộ | `POST /group-classes/:id/waitlist`, `POST /bookings/registrations/:id/cancel`, `POST /group-classes/:id/register-on-behalf` |

Các màn dùng Axios client, query cache, token/role và trạng thái loading/error/empty hiện có. API lỗi 401/403 được giữ theo interceptor và `ErrorState`; endpoint phân quyền phía backend vẫn là nguồn quyết định cuối cùng. Form sửa lớp không gửi `status`; trạng thái đăng ký được cập nhật riêng bằng endpoint status. Lớp mới bắt đầu ở `DRAFT`. Tạo buổi đơn/lặp và đổi/hủy buổi yêu cầu backend kiểm tra xung đột; thao tác hủy buổi yêu cầu lý do. Không cung cấp nút hủy toàn lớp do nghiệp vụ endpoint có thể hủy đăng ký/hoàn tiền và chưa có xác nhận nghiệp vụ tương ứng trong giao diện. Lịch lặp nhập theo giờ Việt Nam và được chuyển sang UTC theo cách service hiện tạo `ClassSession`. FR63 chỉ gửi `newRoomId` khi người dùng chọn phòng khác; nếu giữ phòng thì bỏ trường này khỏi request.

Trang lớp Member thay dữ liệu minh họa bằng API booking: có phân trang, lọc môn/Coach/ngày, xem chi tiết và tạo đơn đăng ký chờ thanh toán. Sau khi tạo đơn, link thanh toán chuyển sang `/member/payments?orderId=...` và điền sẵn mã đơn. API hiện chỉ trả lớp `OPEN`, không cung cấp filter trạng thái; danh sách Coach dùng các Coach xuất hiện trong trang kết quả hiện tại vì chưa có endpoint public để lấy toàn bộ Coach.

Member có thể gửi yêu cầu vào waitlist khi lớp đã đầy; backend kiểm tra lại tình trạng chỗ và điều kiện đăng ký. Receptionist có trang tìm lớp riêng và chọn Member ACTIVE từ API tra cứu người dùng để đăng ký hộ, không nhập Member ID thủ công. Cả Member và Receptionist có thể yêu cầu hủy đăng ký vừa được tạo từ trang xác nhận đơn; backend quyết định cuối cùng theo trạng thái registration và chính sách hủy. Chưa có API danh sách registration của Member để mở thao tác hủy cho các đăng ký cũ trong lịch sử.

**Contract cần backend bổ sung để hoàn tất waitlist:** hiện có API tham gia waitlist và phản hồi offer, nhưng không có API đọc trạng thái waitlist/offer của Member theo lớp. Notification hiện tại không cung cấp `classId` hoặc liên kết hành động. Vì vậy FE không thể an toàn hiển thị offer đến hạn hoặc nút chấp nhận/từ chối sau khi tải lại trang; thao tác phản hồi offer chưa được nối vào UI.

**Contract cần backend bổ sung/xác nhận:** response `GET /private-courses/enrollments` hiện gồm schedule nhưng không gồm occurrence exceptions. UI cập nhật occurrence vừa thao tác ngay trong cache hiện tại, song sau khi tải lại trang backend không cung cấp dữ liệu để tái dựng trạng thái `CANCELLED`/`RESCHEDULED`. Cần trả exceptions (hoặc endpoint occurrences cho Member) để trạng thái được khôi phục chính xác sau reload. Cần xác nhận thêm cách diễn giải múi giờ của `startTime`/`newStartsAt`: API dùng chuỗi ISO và cột Time trong UTC, còn form hiển thị giờ trung tâm Asia/Ho_Chi_Minh.

### Kiểm thử đơn vị

`npm test` chạy Vitest + Testing Library. Các test của module:

- `dataLayer.test.ts`: ngày giờ theo giờ VN, nhóm Tuần → Buổi, tuần hiện tại, đọc lỗi API.
- `components/TodayPlanWidget.test.tsx`: empty state, bỏ qua giáo án đã kết thúc, chuyển buổi.
- `pages/SessionAttendancePage.test.tsx`: một lần PUT với đúng payload, xác nhận khi lưu thiếu, 409 chuyển sang chỉ xem, 422 đánh dấu đúng học viên.
- `components/AssessmentForm.test.tsx`: chỉ một ngữ cảnh, lọc ngữ cảnh theo học viên, không chọn ngày tương lai, 403 hiện tại ô ngữ cảnh.
