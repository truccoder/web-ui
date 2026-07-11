import api from './axios';
import type { PaymentResponse, PaymentSyncResponse } from '@/lib/types';

export const paymentsApi = {
  createPayment: (bookId: number) => api.post<PaymentResponse>(`/v1/api/payments/books/${bookId}`),

  syncPaymentStatus: (transactionRef: string) =>
    api.post<PaymentSyncResponse>(`/v1/api/payments/${transactionRef}/sync`),
};
