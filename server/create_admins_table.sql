-- Create admins table for super admin functionality
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='admins' AND xtype='U')
BEGIN
    CREATE TABLE admins (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(100) NOT NULL UNIQUE,
        email NVARCHAR(255) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(200) NOT NULL,
        role NVARCHAR(50) NOT NULL DEFAULT 'admin', -- 'admin' or 'super_admin'
        is_active BIT NOT NULL DEFAULT 1,
        last_login_at DATETIME2,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        created_by UNIQUEIDENTIFIER NULL,
        CONSTRAINT CHK_admin_role CHECK (role IN ('admin', 'super_admin'))
    );

    CREATE INDEX IDX_admins_username ON admins(username);
    CREATE INDEX IDX_admins_email ON admins(email);
    CREATE INDEX IDX_admins_role ON admins(role);
    CREATE INDEX IDX_admins_is_active ON admins(is_active);

    PRINT '✅ Admins table created successfully';
END
ELSE
BEGIN
    PRINT 'ℹ️ Admins table already exists';
END
GO

-- Create default super admin account (password: SuperAdmin123!)
-- Password hash for "SuperAdmin123!" using bcrypt
DECLARE @superAdminExists INT;
SELECT @superAdminExists = COUNT(*) FROM admins WHERE username = 'superadmin';

IF @superAdminExists = 0
BEGIN
    INSERT INTO admins (username, email, password_hash, full_name, role, is_active)
    VALUES (
        'superadmin',
        'superadmin@forvismazars.com',
        '$2b$10$rWZYnJ4xKQX8vH9Z3KqLe.9YvPZqHQYX6qxHJXz7KqLe9YvPZqHQX', -- SuperAdmin123!
        'Super Administrator',
        'super_admin',
        1
    );
    PRINT '✅ Default super admin created: superadmin / SuperAdmin123!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Super admin already exists';
END
GO

-- Create default regular admin account (password: Admin123!)
DECLARE @adminExists INT;
SELECT @adminExists = COUNT(*) FROM admins WHERE username = 'admin';

IF @adminExists = 0
BEGIN
    INSERT INTO admins (username, email, password_hash, full_name, role, is_active)
    VALUES (
        'admin',
        'admin@forvismazars.com',
        '$2b$10$rWZYnJ4xKQX8vH9Z3KqLe.9YvPZqHQYX6qxHJXz7KqLe9YvPZqHQY', -- Admin123!
        'Regular Administrator',
        'admin',
        1
    );
    PRINT '✅ Default admin created: admin / Admin123!';
END
ELSE
BEGIN
    PRINT 'ℹ️ Admin already exists';
END
GO
