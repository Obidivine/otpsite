-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    service VARCHAR(64) NOT NULL,
    cost_cents BIGINT NOT NULL DEFAULT 100,
	provider VARCHAR(32) DEFAULT 'twilio',
	provider_order_id VARCHAR(255),
    subaccount_sid VARCHAR(255) NOT NULL,
    subaccount_token VARCHAR(255) NOT NULL,
    number_sid VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for O(1) webhook lookups
CREATE INDEX IF NOT EXISTS idx_sessions_phone_number ON public.sessions(phone_number);

-- 3. OTPS TABLE
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) REFERENCES public.sessions(id) ON DELETE CASCADE,
    sender VARCHAR(64) NOT NULL,
    raw_text TEXT NOT NULL,
    code VARCHAR(16),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    amount_cents BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    session_id VARCHAR(64) REFERENCES public.sessions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS public.countries (
    code VARCHAR(8) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    flag_emoji VARCHAR(8) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.services (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    icon_url TEXT
);

-- 7. PRICING TABLE
CREATE TABLE IF NOT EXISTS public.pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(8) REFERENCES public.countries(code) ON DELETE CASCADE,
    service_id VARCHAR(32) REFERENCES public.services(id) ON DELETE CASCADE,
    price_cents BIGINT NOT NULL,
    stock_count INT NOT NULL DEFAULT 0,
    success_rate NUMERIC(5,2) NOT NULL DEFAULT 95.00,
    is_available BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_country_service UNIQUE (country_code, service_id)
);

-- 8. PAYMENT INTENTS TABLE
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tx_ref VARCHAR(255) UNIQUE NOT NULL,
    amount_cents BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_ref ON public.payment_intents(tx_ref);