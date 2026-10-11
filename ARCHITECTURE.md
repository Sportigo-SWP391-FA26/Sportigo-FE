# Cấu trúc frontend

```text
src/
├─ api/             # Axios client và xử lý giao tiếp HTTP chung
├─ app/             # Router, provider và root component
├─ components/      # Component giao diện tái sử dụng giữa nhiều feature
├─ config/          # Cấu hình tĩnh: menu, route metadata
├─ features/        # Nghiệp vụ theo chức năng
│  └─ auth/
│     ├─ api.ts     # Request thuộc feature
│     ├─ schema.ts  # Validation và kiểu input
│     └─ pages/     # Màn hình của feature
├─ layouts/         # Khung trang theo role
├─ pages/           # Trang cấp ứng dụng, không thuộc riêng một feature
├─ styles/          # CSS toàn cục và Tailwind
└─ test/            # Thiết lập test dùng chung
tests/              # Playwright end-to-end tests
```

## Quy tắc phụ thuộc

- `app` ghép các feature; feature không import ngược từ `app`.
- Logic gọi API của một nghiệp vụ đặt trong chính feature đó; Axios client chung nằm ở `src/api`.
- Component chỉ dùng trong một feature thì đặt trong feature; chỉ đưa vào `src/components` khi được tái sử dụng.
- Menu theo role là dữ liệu cấu hình, không viết cứng trong layout.
- Dùng React Query cho server state, React Hook Form + Zod cho form; không sao chép server state vào state cục bộ.
- File test đơn vị đặt cạnh mã nguồn; bài E2E đặt trong thư mục `tests`.
