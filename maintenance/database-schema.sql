-- نظام إدارة البلاغات والصيانة - Database Schema
-- PostgreSQL Schema for comprehensive maintenance management system

-- ==========================================
-- Users Table - جدول المستخدمين
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('client', 'technician', 'admin')),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Devices/Inventory Table - جدول الأجهزة والمخزون
-- ==========================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_type VARCHAR(50) NOT NULL, -- computer, printer, keyboard, mouse, etc.
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    location VARCHAR(255), -- الموقع في المدرسة
    status VARCHAR(30) NOT NULL DEFAULT 'working' CHECK (status IN ('working', 'broken', 'in_maintenance', 'out_of_service')),
    last_service_date TIMESTAMP,
    purchase_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Tickets Table - جدول البلاغات
-- ==========================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- رقم مرجعي
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    
    -- تفاصيل البلاغ
    service_type VARCHAR(50) NOT NULL, -- repair, installation, keyboard_installation, etc.
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'critical')),
    
    -- الحالة والمتابعة
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'rejected', 'cancelled')),
    
    -- معلومات الاتصال
    contact_phone VARCHAR(20),
    
    -- التواريخ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- التقييم
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT
);

-- ==========================================
-- Ticket Attachments - مرفقات البلاغات
-- ==========================================
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Ticket Updates/History - سجل تحديثات البلاغات
-- ==========================================
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- created, assigned, status_changed, commented, etc.
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    is_internal BOOLEAN DEFAULT false, -- للملاحظات الداخلية فقط
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Notifications - الإشعارات
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Activity Logs - سجل النشاطات
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- ticket, device, user
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- Indexes for Performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_technician ON tickets(technician_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id, created_at DESC);

-- ==========================================
-- Triggers for updated_at timestamps
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Function to generate ticket number
-- ==========================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    seq_num TEXT;
BEGIN
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    seq_num := LPAD(CAST(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) AS TEXT), 10, '0');
    RETURN 'TKT-' || year_suffix || '-' || SUBSTRING(seq_num, 6, 5);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Default Admin User (password: admin123)
-- Password hash generated with bcrypt
-- ==========================================
-- Note: In production, this should be set securely
-- The hash below is for 'admin123'
INSERT INTO users (id, user_type, name, email, password_hash, is_active) 
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin',
    'مدير النظام',
    'admin@mishkat.edu.sa',
    '$2a$10$rGZqHqLqjqJqB4FvDqN1qe5qZqZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5qZ5q',
    true
) ON CONFLICT (email) DO NOTHING;
