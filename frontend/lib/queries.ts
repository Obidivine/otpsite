// frontend/lib/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  CatalogResponse,
  SessionDetails,
  RentResponse,
  BalanceResponse,
  TransactionsResponse,
  TopupInitResponse,
} from '@/types/api';

export function useBalance() {
  return useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const { data } = await api.get<BalanceResponse>('/api/v1/wallet/balance');
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useCatalog(service: string) {
  return useQuery({
    queryKey: ['catalog', service],
    queryFn: async () => {
      const { data } = await api.get<CatalogResponse>(
        `/api/v1/catalog?service=${service}`
      );
      return data;
    },
    enabled: !!service,
  });
}

export function useSession(phoneNumber: string) {
  return useQuery({
    queryKey: ['session', phoneNumber],
    queryFn: async () => {
      const { data } = await api.get<SessionDetails>(
        `/api/v1/sessions/${encodeURIComponent(phoneNumber)}`
      );
      return data;
    },
    enabled: !!phoneNumber,
    refetchInterval: 3000,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await api.get<TransactionsResponse>('/api/v1/wallet/transactions');
      return data;
    },
  });
}

export function useRentNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ service, country }: { service: string; country: string }) => {
      const { data } = await api.post<RentResponse>('/api/v1/sessions/rent', {
        service,
        country,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
  });
}

export function useTopupInit() {
  return useMutation({
    mutationFn: async ({ amountCents }: { amountCents: number }) => {
      const { data } = await api.post<TopupInitResponse>('/api/v1/wallet/topup/init', {
        amountCents,
      });
      return data;
    },
  });
}