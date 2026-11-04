# Ma trận giao diện theo role

Ngày rà soát: 2026-10-28

## Hệ giao diện đã chuẩn hóa

| Đối tượng | Khung điều hướng | Accent | Mật độ | Route đại diện | Trạng thái |
|---|---|---|---|---|---|
| Public/Auth | Navbar ngang trên hero | Sky/blue/lime/orange | Thoáng, giàu hình ảnh | `/`, `/login`, `/register` | Đạt |
| Member | Navbar ngang, menu thu gọn trên mobile | Blue/sky | Vừa, ưu tiên lịch và hình ảnh | `/member/home`, `/member/classes`, `/member/payments`, `/member/training-plan`, `/member/progress` | Đạt |
| Coach | Sidebar nghiệp vụ + mobile header | Blue/lime | Vừa–cao | `/coach/attendance`, `/coach/schedule`, `/coach/workout-plans`, `/coach/assessments` | Đạt khung |
| Receptionist | Sidebar nghiệp vụ + mobile header | Blue/orange | Cao, ưu tiên thao tác nhanh | `/app/cashier`, `/app/class-bookings`, `/app/users`, `/app/support` | Đạt khung |
| Center Manager | Sidebar quản trị + mobile header | Deep blue/slate | Cao, bảng và bộ lọc | `/app/dashboard`, `/app/staff`, `/app/classes`, `/app/revenue`, `/app/website-content` | Đạt khung |

## Quy chuẩn dùng chung

- Primitive dùng chung nằm tại `src/components/ui`: Button, Card, PageHeader, Chip, Dialog, Field, Pagination, Tabs và các trạng thái Loading/Empty/Error.
- Coach, Receptionist và Center Manager dùng cùng App shell; khác menu, accent và mật độ theo `data-role-theme`.
- Member không dùng sidebar. Public/Auth không dùng component quản trị.
- Mọi route nghiệp vụ đều được bảo vệ theo role ở router; route Member cũng được bọc `RequireRole`.
- Nội dung Landing, Auth, Member Home và Manager Dashboard lấy từ API/database; không còn runtime mock.

## Kết quả rà soát

| Mức độ | Nội dung | Xử lý |
|---|---|---|
| Critical | Route Member trước đây chưa được bảo vệ đồng nhất | Đã sửa |
| Major | UI primitive nằm trong feature Training khiến các role phụ thuộc sai tầng | Đã chuyển lên `src/components/ui` |
| Major | Landing, Auth, Member Home và Dashboard dùng số liệu/nội dung cứng | Đã chuyển sang API thật |
| Major | Sidebar chưa thể hiện role/accent và mobile shell chưa thống nhất | Đã sửa |
| Minor | Bundle chính vẫn lớn hơn 500 kB sau minify | Cần tách route bằng lazy loading ở vòng tối ưu hiệu năng |
| Minor | E2E Training cần database test riêng trước khi bật bộ test ghi dữ liệu | Đã khóa an toàn bằng `E2E_TRAINING_FIXTURE=1`; chưa có hạ tầng DB test thường trực |

## Điều kiện bật E2E Training

Chỉ đặt `E2E_TRAINING_FIXTURE=1` khi `E2E_API_URL` trỏ tới backend dùng database test riêng đã seed. Không dùng Supabase development/production cho các kịch bản tạo giáo án, điểm danh hoặc đánh giá tiến độ.
