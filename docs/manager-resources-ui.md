# Quản lý bộ môn và phòng

## Routes và quyền

- `/app/sports` — Center Manager quản lý bộ môn.
- `/app/rooms` — Center Manager quản lý phòng tập.

Hai route nằm trong nhánh `RequireRole(CENTER_MANAGER)`. API vẫn là nơi kiểm tra quyền cuối cùng.

## API

- Bộ môn: `GET`, `POST /sports`, `PUT /sports/:id`.
- Phòng: `GET`, `POST /rooms`, `PUT /rooms/:id`.

Response danh sách và tạo/cập nhật dùng `{ success, data }`. Môn dùng `name`, `description`, `imageUrl`, `isActive`. Phòng dùng `code`, `name`, `capacity`, `location`, `status`; trạng thái là `AVAILABLE`, `MAINTENANCE` hoặc `INACTIVE`.

UI không cung cấp thao tác xóa cứng: Manager có thể ngừng bộ môn hoặc chuyển phòng sang `INACTIVE` để giữ an toàn các tham chiếu lịch sử và quan hệ dịch vụ. Các endpoint xóa hiện có trong backend không được gọi từ giao diện này.
