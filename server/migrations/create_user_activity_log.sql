-- Create user activity log table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_activity_log')
BEGIN
    CREATE TABLE user_activity_log (
        id INT IDENTITY(1,1) PRIMARY KEY,
        lead_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,  -- LOGIN, ASSESSMENT_START, ASSESSMENT_COMPLETE, etc.
        entity_type VARCHAR(50),           -- assessment, profile, etc.
        entity_id INT,
        description NVARCHAR(500),
        ip_address VARCHAR(45),
        user_agent NVARCHAR(500),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_user_activity_lead_id ON user_activity_log(lead_id);
    CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);
    CREATE INDEX idx_user_activity_action_type ON user_activity_log(action_type);

    PRINT 'User activity log table created successfully';
END
ELSE
BEGIN
    PRINT 'User activity log table already exists';
END
GO
