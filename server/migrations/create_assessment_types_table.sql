-- ============================================
-- Create Assessment Types Configuration Table
-- ============================================
-- This table stores metadata for assessment types that appear on the home screen

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'assessment_types_config')
BEGIN
  CREATE TABLE assessment_types_config (
    id INT PRIMARY KEY IDENTITY(1,1),
    assessment_type NVARCHAR(50) NOT NULL UNIQUE,
    title NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX),
    duration NVARCHAR(50),  -- e.g., "25 questions • ~5 minutes"
    icon NVARCHAR(50),       -- FontAwesome icon class, e.g., "fas fa-rocket"
    features NVARCHAR(MAX),  -- JSON array of feature strings
    audience NVARCHAR(100),  -- e.g., "Executives & Leaders"
    audience_color NVARCHAR(20), -- e.g., "green", "blue", "purple"
    is_active BIT DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    created_by INT,
    
    INDEX idx_assessment_type_active (assessment_type, is_active),
    INDEX idx_display_order (display_order, is_active)
  );

  PRINT '✅ Created assessment_types_config table';
END
ELSE
BEGIN
  PRINT 'ℹ️  assessment_types_config table already exists';
END
GO

-- Insert default assessment types
IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'CORE')
BEGIN
  INSERT INTO assessment_types_config 
    (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
  VALUES 
    ('CORE', 'Core Assessment', 'Essential AI readiness evaluation for leadership teams', 
     '25 questions • ~5 minutes', 'fas fa-rocket',
     '["AI strategy alignment", "Governance essentials", "Basic readiness factors"]',
     'Executives & Leaders', 'green', 1);
     
  PRINT '✅ Inserted CORE assessment type';
END

IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'ADVANCED')
BEGIN
  INSERT INTO assessment_types_config 
    (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
  VALUES 
    ('ADVANCED', 'Advanced Assessment', 'Deep dive into technical capabilities and infrastructure', 
     '45 questions • ~9 minutes', 'fas fa-cogs',
     '["Technical infrastructure", "Data pipeline maturity", "Advanced capabilities"]',
     'CIOs & Technical Leaders', 'blue', 2);
     
  PRINT '✅ Inserted ADVANCED assessment type';
END

IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'FRONTIER')
BEGIN
  INSERT INTO assessment_types_config 
    (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
  VALUES 
    ('FRONTIER', 'Frontier Assessment', 'Cutting-edge AI capabilities and innovation readiness', 
     '60 questions • ~12 minutes', 'fas fa-brain',
     '["Next-gen capabilities", "Multi-agent orchestration", "Cutting-edge readiness"]',
     'AI Centers of Excellence', 'purple', 3);
     
  PRINT '✅ Inserted FRONTIER assessment type';
END

IF NOT EXISTS (SELECT * FROM assessment_types_config WHERE assessment_type = 'TEST')
BEGIN
  INSERT INTO assessment_types_config 
    (assessment_type, title, description, duration, icon, features, audience, audience_color, display_order)
  VALUES 
    ('TEST', 'Test Assessment', 'Quality assurance and testing maturity evaluation', 
     '20 questions • ~4 minutes', 'fas fa-flask',
     '["QA automation maturity", "Testing infrastructure", "Quality metrics tracking"]',
     'QA & Testing Teams', 'orange', 4);
     
  PRINT '✅ Inserted TEST assessment type';
END

PRINT '✅ Assessment types configuration table migration complete';
GO
