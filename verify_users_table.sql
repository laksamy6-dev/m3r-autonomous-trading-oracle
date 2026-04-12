-- Verified Users Table (for Twilio Verify)
CREATE TABLE IF NOT EXISTS verified_users (
    id SERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    verified_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    country_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verified_phone ON verified_users(phone);

-- Remove old PIN references if any
-- DROP TABLE IF EXISTS pin_codes;
-- DROP TABLE IF EXISTS otp_codes;
