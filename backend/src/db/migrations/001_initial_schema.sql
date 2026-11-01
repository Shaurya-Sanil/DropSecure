-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('DELIVERY', 'RECIPIENT', 'GUARD', 'ADMIN')),
    phone VARCHAR(50),
    room_number VARCHAR(50),
    campus_id VARCHAR(50) DEFAULT 'CAMPUS-BANDRA',
    email_confirmed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Parcels Table
CREATE TABLE IF NOT EXISTS parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dropped_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    image_key VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COLLECTED', 'EXPIRED')),
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMPTZ,
    otp_attempts INTEGER NOT NULL DEFAULT 0,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    verified_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    carrier VARCHAR(100),
    campus_id VARCHAR(50) DEFAULT 'CAMPUS-BANDRA',
    locker_number VARCHAR(20) DEFAULT 'L-01',
    locker_size VARCHAR(20) DEFAULT 'MEDIUM',
    package_condition VARCHAR(50) DEFAULT 'INTACT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Parcel Lookups
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_recipient_id ON parcels(recipient_id);
CREATE INDEX IF NOT EXISTS idx_parcels_tracking_code ON parcels(tracking_code);
CREATE INDEX IF NOT EXISTS idx_parcels_created_at ON parcels(created_at);
CREATE INDEX IF NOT EXISTS idx_parcels_stale_sweep ON parcels(status, created_at, last_reminded_at) WHERE status = 'PENDING';

-- 3. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_parcel_id ON audit_log(parcel_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- 4. Outbox Notifications (Dev & Fallback Mirror for SNS)
CREATE TABLE IF NOT EXISTS outbox_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'SENT',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_recipient ON outbox_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox_notifications(created_at DESC);

-- 5. Local Queue Messages (Used when PROVIDER_MODE=local across separate processes)
CREATE TABLE IF NOT EXISTS local_queue_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    body JSONB NOT NULL,
    receipt_handle VARCHAR(255) UNIQUE NOT NULL,
    visible_after TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_queue_visibility ON local_queue_messages(visible_after);

