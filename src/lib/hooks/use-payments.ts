'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentsApi } from '@/lib/api/payments';
import { getErrorMessage } from '@/lib/api/error';

export function useCreatePayment() {
  return useMutation({
    mutationFn: (bookId: number) => paymentsApi.createPayment(bookId).then((r) => r.data),
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Failed to start payment'));
    },
  });
}

export function useSyncPaymentStatus() {
  return useMutation({
    mutationFn: (transactionRef: string) =>
      paymentsApi.syncPaymentStatus(transactionRef).then((r) => r.data),
  });
}
