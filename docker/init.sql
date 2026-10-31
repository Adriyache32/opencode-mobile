-- OpenCode Mobile Database Initialization
-- This runs on first PostgreSQL container startup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url VARCHAR(500),
    totp_secret VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    platform VARCHAR(50),
    user_agent TEXT,
    device_token_hash VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_hash VARCHAR(255) UNIQUE,
    permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_seen_at TIMESTAMPTZ,
    paired_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS devices_user_idx ON devices(user_id);
CREATE INDEX IF NOT EXISTS devices_token_hash_idx ON devices(device_token_hash);

-- Pairing challenges table
CREATE TABLE IF NOT EXISTS pairing_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    code_salt VARCHAR(32) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    consumed_at TIMESTAMPTZ,
    device_token_hash VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS pairing_user_idx ON pairing_challenges(user_id);
CREATE INDEX IF NOT EXISTS pairing_expires_idx ON pairing_challenges(expires_at);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    opencode_session_id VARCHAR(100) NOT NULL,
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_device_idx ON sessions(device_id);
CREATE INDEX IF NOT EXISTS sessions_opencode_idx ON sessions(opencode_session_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    opencode_message_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_session_idx ON messages(session_id);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages(created_at);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50),
    resource_id VARCHAR(100),
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_device_idx ON audit_logs(device_id);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at);

-- Device permissions table
CREATE TABLE IF NOT EXISTS device_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    allowed BOOLEAN DEFAULT TRUE NOT NULL,
    requires_confirmation BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, permission)
);

CREATE INDEX IF NOT EXISTS dev_perm_device_idx ON device_permissions(device_id);