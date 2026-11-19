import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';

/** Tạo lỗi Axios giống response thật của backend để test xử lý lỗi */
export function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  const response = { status, data, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, response);
}
