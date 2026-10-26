import axios from 'axios';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

export type ApiErrorKind =
  | 'network'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'not-ready'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'unknown';

export type ApiError = {
  kind: ApiErrorKind;
  status: number | null;
  code: string | null;
  message: string;
  fieldErrors: Record<string, string>;
  details: unknown;
};

type ErrorBody = { code?: string; message?: string; details?: unknown };

// Thông báo dự phòng khi backend không trả message tiếng Việt (nguyên văn backlog/training-api.md)
const codeMessages: Record<string, string> = {
  ATTENDANCE_LOCKED: 'Bản ghi điểm danh không hợp lệ hoặc buổi học đã khóa dữ liệu.',
  REGISTRATION_NOT_ELIGIBLE: 'Học viên chưa đăng ký hợp lệ cho buổi học này.',
  SPORT_NOT_AVAILABLE: 'Môn thể thao không tồn tại hoặc đã ngừng hoạt động.',
  PLAN_SPORT_LOCKED: 'Không thể đổi môn của giáo án đã được gán cho học viên.',
  PLAN_HAS_NO_ITEMS: 'Giáo án phải có ít nhất một mục trước khi kích hoạt.',
  DURATION_TOO_SHORT: 'Số tuần không được nhỏ hơn tuần lớn nhất đang có mục.',
  WEEK_OUT_OF_RANGE: 'Tuần vượt quá thời lượng giáo án.',
  DUPLICATE_ITEM_ORDER: 'Thứ tự mục giáo án bị trùng.',
  REORDER_INCOMPLETE: 'Danh sách sắp xếp chưa đủ các mục của buổi.',
  ITEMS_NOT_SAME_SLOT: 'Các mục sắp xếp phải cùng tuần và cùng buổi.',
  ITEM_NOT_IN_PLAN: 'Có mục không thuộc giáo án này.',
  PLAN_NEEDS_ITEMS: 'Không thể xóa mục cuối cùng của giáo án đang hoạt động.',
  PLAN_NOT_ASSIGNABLE: 'Giáo án không cùng môn hoặc chưa được kích hoạt.',
  ENROLLMENT_NOT_ACTIVE: 'Khóa học 1-1 chưa ở trạng thái hoạt động nên chưa thể gán giáo án.',
  PLAN_ALREADY_ASSIGNED: 'Giáo án này đang được gán cho khóa học.',
  ASSESSMENT_CONTEXT_INVALID: 'Coach không phụ trách học viên hoặc ngữ cảnh đánh giá không hợp lệ.',
};

const statusMessages: Record<ApiErrorKind, string> = {
  network: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
  unauthenticated: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  'not-found': 'Không tìm thấy dữ liệu yêu cầu.',
  'not-ready': 'Chức năng này đang chờ backend bổ sung API nên chưa sẵn sàng.',
  conflict: 'Dữ liệu vừa thay đổi. Vui lòng tải lại để xem trạng thái mới.',
  validation: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.',
  server: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  unknown: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.',
};

// Backend dùng thông báo mặc định của zod (tiếng Anh) cho nhiều lỗi validate,
// nên chỉ giữ message của backend khi nó là tiếng Việt.
const VIETNAMESE_TEXT = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

function vietnameseOnly(message: unknown) {
  return typeof message === 'string' && VIETNAMESE_TEXT.test(message) ? message : null;
}

function isErrorBody(data: unknown): data is ErrorBody {
  return typeof data === 'object' && data !== null && ('code' in data || 'message' in data);
}

function kindFromStatus(status: number, hasBody: boolean): ApiErrorKind {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  // Express trả trang HTML "Cannot GET" khi route chưa tồn tại
  if (status === 404) return hasBody ? 'not-found' : 'not-ready';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

function extractFieldErrors(details: unknown) {
  const result: Record<string, string> = {};
  const fieldErrors = (details as { fieldErrors?: Record<string, unknown> } | undefined)?.fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== 'object') return result;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = Array.isArray(messages) ? messages[0] : messages;
    result[field] = vietnameseOnly(first) ?? 'Giá trị không hợp lệ.';
  }
  return result;
}

export function parseApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'unknown', status: null, code: null, message: statusMessages.unknown, fieldErrors: {}, details: undefined };
  }
  if (!error.response) {
    return { kind: 'network', status: null, code: null, message: statusMessages.network, fieldErrors: {}, details: undefined };
  }

  const { status, data } = error.response;
  const body = isErrorBody(data) ? data : null;
  const kind = kindFromStatus(status, body !== null);
  const code = body?.code ?? null;
  const message =
    kind === 'unauthenticated' || kind === 'not-ready'
      ? statusMessages[kind]
      : vietnameseOnly(body?.message) ?? (code ? codeMessages[code] : undefined) ?? statusMessages[kind];

  return { kind, status, code, message, fieldErrors: extractFieldErrors(body?.details), details: body?.details };
}

// Không thử lại với lỗi 4xx (sai quyền, chưa có API...), chỉ thử lại một lần với lỗi mạng/5xx.
export function retryServerErrors(failureCount: number, error: unknown) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

// Gắn lỗi của backend vào đúng trường trong form React Hook Form.
// `codeFields` dùng cho lỗi nghiệp vụ không có fieldErrors, ví dụ DUPLICATE_ITEM_ORDER → itemOrder.
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  apiError: ApiError,
  fields: readonly Path<T>[],
  codeFields: Partial<Record<string, Path<T>>> = {},
) {
  let applied = false;
  for (const field of fields) {
    const message = apiError.fieldErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      applied = true;
    }
  }
  const codeField = apiError.code ? codeFields[apiError.code] : undefined;
  if (codeField) {
    setError(codeField, { type: 'server', message: apiError.message }, { shouldFocus: true });
    applied = true;
  }
  return applied;
}
