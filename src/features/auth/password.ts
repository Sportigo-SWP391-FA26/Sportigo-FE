import { z } from 'zod';

export const PASSWORD_RULE_MESSAGE = 'Mật khẩu phải dài từ 8 đến 72 ký tự';

// BR-03: khớp với backend, chỉ kiểm tra độ dài
export const strongPasswordSchema = z.string().min(8, PASSWORD_RULE_MESSAGE).max(72, PASSWORD_RULE_MESSAGE);
