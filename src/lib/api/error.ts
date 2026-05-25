import { AxiosError } from 'axios';

interface BackendErrorResponse {
  code: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  details: unknown;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as BackendErrorResponse;
    if (data.message) return data.message;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}
