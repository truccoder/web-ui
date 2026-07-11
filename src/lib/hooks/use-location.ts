'use client';

import { useMutation } from '@tanstack/react-query';
import { locationApi } from '@/lib/api/location';

export function useResolveLocation() {
  return useMutation({
    mutationFn: (query: string) => locationApi.resolve(query).then((r) => r.data),
  });
}
