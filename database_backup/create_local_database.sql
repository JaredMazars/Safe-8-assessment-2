-- ============================================
-- SAFE-8 Local Database Setup Script
-- ============================================
-- This script creates a local SAFE-8 database
-- with schema and sample data
-- ============================================

USE master;
GO

-- Drop database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SAFE8_Local')
BEGIN
    ALTER DATABASE [SAFE8_Local] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [SAFE8_Local];
END
GO

-- Create database
CREATE DATABASE [SAFE8_Local];
GO

USE [SAFE8_Local];
GO

-- ============================================
-- Table: admin_users
-- ============================================
CREATE TABLE [admin_users] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [username] nvarchar(100) NOT NULL UNIQUE,
    [email] nvarchar(255) NOT NULL UNIQUE,
    [password_hash] nvarchar(255) NOT NULL,
    [full_name] nvarchar(255) NULL,
    [role] nvarchar(50) NOT NULL DEFAULT 'admin',
    [is_active] bit NOT NULL DEFAULT 1,
    [last_login_at] datetime2 NULL,
    [last_login_ip] nvarchar(45) NULL,
    [login_attempts] int NOT NULL DEFAULT 0,
    [locked_until] datetime2 NULL,
    [must_change_password] bit NOT NULL DEFAULT 0,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- Table: assessment_type_configs
-- ============================================
CREATE TABLE [assessment_type_configs] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [type] nvarchar(50) NOT NULL UNIQUE,
    [title] nvarchar(255) NOT NULL,
    [description] nvarchar(MAX) NULL,
    [duration] nvarchar(100) NULL,
    [icon] nvarchar(100) NULL,
    [features] nvarchar(MAX) NULL,
    [audience] nvarchar(255) NULL,
    [audience_color] nvarchar(50) NULL,
    [is_active] bit NOT NULL DEFAULT 1,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- Table: industries
-- ============================================
CREATE TABLE [industries] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL UNIQUE,
    [is_active] bit NOT NULL DEFAULT 1,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- Table: pillars
-- ============================================
CREATE TABLE [pillars] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [name] nvarchar(255) NOT NULL,
    [short_name] nvarchar(50) NOT NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE()
);
GO

-- ============================================
-- Table: questions
-- ============================================
CREATE TABLE [questions] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [question_text] nvarchar(MAX) NOT NULL,
    [pillar_id] int NOT NULL,
    [assessment_type] nvarchar(50) NOT NULL,
    [question_order] int NOT NULL,
    [is_active] bit NOT NULL DEFAULT 1,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY ([pillar_id]) REFERENCES [pillars]([id])
);
GO

-- ============================================
-- Table: leads
-- ============================================
CREATE TABLE [leads] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [contact_name] nvarchar(255) NOT NULL,
    [email] nvarchar(255) NOT NULL UNIQUE,
    [password_hash] nvarchar(255) NULL,
    [phone] nvarchar(50) NULL,
    [company_name] nvarchar(255) NOT NULL,
    [company_size] nvarchar(50) NULL,
    [industry] nvarchar(100) NULL,
    [country] nvarchar(100) NULL,
    [is_email_verified] bit NOT NULL DEFAULT 0,
    [email_verification_token] nvarchar(255) NULL,
    [email_verification_expires] datetime2 NULL,
    [password_reset_token] nvarchar(255) NULL,
    [password_reset_expires] datetime2 NULL,
    [last_login_at] datetime2 NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [deleted_at] datetime2 NULL
);
GO

-- ============================================
-- Table: assessments
-- ============================================
CREATE TABLE [assessments] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [lead_id] int NOT NULL,
    [assessment_type] nvarchar(50) NOT NULL,
    [industry] nvarchar(100) NULL,
    [overall_score] decimal(5,2) NULL,
    [pillar_scores] nvarchar(MAX) NULL,
    [responses] nvarchar(MAX) NULL,
    [insights] nvarchar(MAX) NULL,
    [recommendations] nvarchar(MAX) NULL,
    [status] nvarchar(50) NOT NULL DEFAULT 'in_progress',
    [started_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [completed_at] datetime2 NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY ([lead_id]) REFERENCES [leads]([id])
);
GO

-- ============================================
-- Table: assessment_answers
-- ============================================
CREATE TABLE [assessment_answers] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [assessment_id] int NOT NULL,
    [question_id] int NOT NULL,
    [answer_value] int NOT NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY ([assessment_id]) REFERENCES [assessments]([id]) ON DELETE CASCADE,
    FOREIGN KEY ([question_id]) REFERENCES [questions]([id])
);
GO

-- ============================================
-- Table: pillar_weights
-- ============================================
CREATE TABLE [pillar_weights] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [assessment_type] nvarchar(50) NOT NULL,
    [pillar_id] int NOT NULL,
    [weight] decimal(5,2) NOT NULL DEFAULT 1.00,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE(),
    [updated_at] datetime2 NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY ([pillar_id]) REFERENCES [pillars]([id]),
    CONSTRAINT [UQ_assessment_pillar] UNIQUE ([assessment_type], [pillar_id])
);
GO

-- ============================================
-- Table: user_activity_log
-- ============================================
CREATE TABLE [user_activity_log] (
    [id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [user_type] nvarchar(50) NOT NULL,
    [user_id] int NOT NULL,
    [action] nvarchar(100) NOT NULL,
    [entity_type] nvarchar(50) NULL,
    [entity_id] int NULL,
    [details] nvarchar(MAX) NULL,
    [ip_address] nvarchar(45) NULL,
    [user_agent] nvarchar(500) NULL,
    [created_at] datetime2 NOT NULL DEFAULT GETDATE()
);
GO

CREATE INDEX [idx_activity_user] ON [user_activity_log]([user_type], [user_id]);
CREATE INDEX [idx_activity_created] ON [user_activity_log]([created_at]);
GO

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Admin Users
SET IDENTITY_INSERT [admin_users] ON;
INSERT INTO [admin_users] ([id], [username], [email], [password_hash], [full_name], [role], [is_active], [created_at], [updated_at])
VALUES 
(1, N'superadmin', N'superadmin@forvismazars.com', N'$2b$10$XQJ3q8GQ8xqH9xY3x4x4x.xJ3q8GQ8xqH9xY3x4x4x.xJ3q8GQ8xqH', N'Super Administrator', N'super_admin', 1, GETDATE(), GETDATE()),
(2, N'jared', N'jared.moodley@mazars.co.za', N'$2b$10$XQJ3q8GQ8xqH9xY3x4x4x.xJ3q8GQ8xqH9xY3x4x4x.xJ3q8GQ8xqH', N'Jared Moodley', N'super_admin', 1, GETDATE(), GETDATE()),
(3, N'admin', N'admin@forvismazars.com', N'$2b$10$m8xQz2xXj5rK3vL6vL6vLOxK3vL6vL6vL6vL6vL6vL6vL6vL6vL6u', N'System Administrator', N'admin', 1, GETDATE(), GETDATE());
SET IDENTITY_INSERT [admin_users] OFF;
GO

-- NOTE: Password for all admin accounts is: Admin123!
-- The hash shown here is just a placeholder - you'll need to generate proper bcrypt hashes

-- Pillars
SET IDENTITY_INSERT [pillars] ON;
INSERT INTO [pillars] ([id], [name], [short_name], [created_at], [updated_at])
VALUES
(1, N'Strategy & Vision', N'STRATEGY', GETDATE(), GETDATE()),
(2, N'Governance & Ethics', N'GOVERNANCE', GETDATE(), GETDATE()),
(3, N'Data & Infrastructure', N'DATA', GETDATE(), GETDATE()),
(4, N'Talent & Culture', N'TALENT', GETDATE(), GETDATE()),
(5, N'Technology & Tools', N'TECHNOLOGY', GETDATE(), GETDATE()),
(6, N'Process & Operations', N'PROCESS', GETDATE(), GETDATE()),
(7, N'Innovation & Experimentation', N'INNOVATION', GETDATE(), GETDATE()),
(8, N'Risk & Security', N'RISK', GETDATE(), GETDATE());
SET IDENTITY_INSERT [pillars] OFF;
GO

-- Industries
SET IDENTITY_INSERT [industries] ON;
INSERT INTO [industries] ([id], [name], [is_active], [created_at])
VALUES
(1, N'Technology', 1, GETDATE()),
(2, N'Healthcare', 1, GETDATE()),
(3, N'Financial Services', 1, GETDATE()),
(4, N'Retail', 1, GETDATE()),
(5, N'Manufacturing', 1, GETDATE()),
(6, N'Education', 1, GETDATE()),
(7, N'Government', 1, GETDATE()),
(8, N'Other', 1, GETDATE());
SET IDENTITY_INSERT [industries] OFF;
GO

-- Assessment Type Configs
SET IDENTITY_INSERT [assessment_type_configs] ON;
INSERT INTO [assessment_type_configs] ([id], [type], [title], [description], [duration], [icon], [features], [audience], [audience_color], [is_active])
VALUES
(1, N'core', N'Core Assessment', N'Foundation AI readiness evaluation', N'25 questions • ~5 minutes', N'fas fa-rocket', N'AI strategy alignment, Governance essentials, Basic readiness factors', N'Executives & Leaders', N'green', 1),
(2, N'advanced', N'Advanced Assessment', N'Technical AI capabilities assessment', N'45 questions • ~9 minutes', N'fas fa-cogs', N'Technical infrastructure, Data pipeline maturity, Advanced capabilities', N'CIOs & Technical Leaders', N'blue', 1),
(3, N'frontier', N'Frontier Assessment', N'Cutting-edge AI readiness evaluation', N'60 questions • ~12 minutes', N'fas fa-brain', N'Next-gen capabilities, Multi-agent orchestration, Cutting-edge readiness', N'AI Centers of Excellence', N'purple', 1);
SET IDENTITY_INSERT [assessment_type_configs] OFF;
GO

PRINT '✅ Database schema and sample data created successfully!';
PRINT '';
PRINT '📊 Database: SAFE8_Local';
PRINT '🔐 Admin Credentials:';
PRINT '   Username: admin';
PRINT '   Email: admin@forvismazars.com';
PRINT '   Password: Admin123!';
PRINT '';
PRINT '⚙️ Update your .env file:';
PRINT '   DB_SERVER=localhost';
PRINT '   DB_NAME=SAFE8_Local';
PRINT '   DB_USER=';
PRINT '   DB_PASSWORD=';
PRINT '   DB_INTEGRATED_SECURITY=true';
GO
