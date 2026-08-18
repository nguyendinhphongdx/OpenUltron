import { isAxiosError } from 'axios';

/** Wire shape lỗi từ FastAPI (`app/core/errors.py`): `{ message, error, status_code, ... }`. */
interface ApiErrorResponse {
  message?: string;
  error?: string;
}

const DEFAULT_MESSAGE = 'Có lỗi xảy ra, vui lòng thử lại.';

export function getApiErrorMessage(err: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (isAxiosError<ApiErrorResponse>(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function getApiStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}
