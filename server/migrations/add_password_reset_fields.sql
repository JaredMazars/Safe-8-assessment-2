-- Add password reset fields to leads table
-- Run this script to enable password reset functionality

-- Check if columns exist before adding them
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('leads') AND name = 'reset_token_hash')
BEGIN
    ALTER TABLE leads ADD reset_token_hash NVARCHAR(255) NULL;
    PRINT 'Added reset_token_hash column';
END
ELSE
    PRINT 'reset_token_hash column already exists';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('leads') AND name = 'reset_token_expires')
BEGIN
    ALTER TABLE leads ADD reset_token_expires DATETIME NULL;
    PRINT 'Added reset_token_expires column';
END
ELSE
    PRINT 'reset_token_expires column already exists';

-- Create index for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('leads') AND name = 'IX_leads_reset_token_hash')
BEGIN
    CREATE INDEX IX_leads_reset_token_hash ON leads(reset_token_hash);
    PRINT 'Created index IX_leads_reset_token_hash';
END
ELSE
    PRINT 'Index IX_leads_reset_token_hash already exists';

PRINT 'Password reset migration completed successfully';
GO
