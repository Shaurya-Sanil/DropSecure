-- Migration 002: Formal Campuses Table & Multi-Tenant Scoping
-- Creates dedicated campuses table and adds foreign key constraints & indexes

CREATE TABLE IF NOT EXISTS campuses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial multi-campus locations
INSERT INTO campuses (id, name, code, address, active)
VALUES
    ('CAMPUS-BANDRA', 'Fr. Conceicao Rodrigues College of Engineering (Fr. CRCE)', 'CRCE-BANDRA', 'Bandstand, Bandra (W), Mumbai 400050', TRUE),
    ('CAMPUS-VASHI', 'Fr. C. Rodrigues Institute of Technology (Fr. CRIT)', 'CRIT-VASHI', 'Agnel Technical Complex, Sector 9A, Vashi, Navi Mumbai 400703', TRUE),
    ('CAMPUS-NERUL', 'Agnel Technical College & Research Campus', 'AGNEL-NERUL', 'Sector 4, Nerul, Navi Mumbai 400706', TRUE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, address = EXCLUDED.address;

-- Ensure audit_log has campus_id
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS campus_id VARCHAR(50) DEFAULT 'CAMPUS-BANDRA';

-- Add index on campus_id across tables for fast multi-tenant querying
CREATE INDEX IF NOT EXISTS idx_users_campus_id ON users(campus_id);
CREATE INDEX IF NOT EXISTS idx_parcels_campus_id ON parcels(campus_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_campus_id ON audit_log(campus_id);

