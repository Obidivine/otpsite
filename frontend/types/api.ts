// frontend/types/api.ts

export interface User {
  id: string;
  email: string;
  balance_cents: number;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface CatalogItem {
  country_code: string;
  country_name: string;
  flag_emoji: string;
  price_cents: number;
  stock_count: number;
  success_rate: number;
  is_available: boolean;
}

export interface CatalogResponse {
  service: string;
  currency: 'USD_CENTS';
  catalog: CatalogItem[];
}

export interface RentResponse {
  success: boolean;
  sessionId: string;
  phoneNumber: string;
  service: string;
  costCents: number;
  expiresAt: number;
}

export interface SessionDetails {
  id: string;
  userId: string;
  service: string;
  costCents: number;
  subaccountSid: string;
  subaccountToken: string;
  numberSid: string;
  phoneNumber: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'RELEASED';
  expiresAt: number;
  refundedAt: string | null;
  otp: {
    code: string;
    sender: string;
    rawText: string;
    receivedAt: string;
  } | null;
}

export interface BalanceResponse {
  success: boolean;
  balanceCents: number;
  balanceUSD: string;
}

export interface Transaction {
  amount_cents: number;
  type: 'DEPOSIT' | 'HOLD' | 'REFUND';
  reference: string;
  status: string;
  notes: string;
  created_at: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions: Transaction[];
}

export interface TopupInitResponse {
  success: boolean;
  txRef: string;
  amountCents: number;
  amountNGN: number;
  currency: 'NGN';
}

// Session summary (as returned by GET /api/v1/sessions)
export interface SessionSummary {
  id: string;
  userId: string;
  service: string;
  costCents: number;
  phoneNumber: string;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'RELEASED';
  expiresAt: number;
  refundedAt: string | null;
  createdAt: string;
}

export interface SessionsListResponse {
  success: boolean;
  sessions: SessionSummary[];
}