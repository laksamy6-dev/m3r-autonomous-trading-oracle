-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Verified Users Table
CREATE TABLE IF NOT EXISTS verified_users (
    id SERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    verified_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Fix AI State Table (ensure IQ updates persist)
ALTER TABLE ai_state ADD COLUMN IF NOT EXISTS learning_cycles INTEGER DEFAULT 0;
ALTER TABLE ai_state ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT NOW();

-- Ensure IQ column exists and has default
ALTER TABLE ai_state ALTER COLUMN iq SET DEFAULT 72500;
