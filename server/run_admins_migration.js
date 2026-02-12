import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcrypt';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME || process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

async function runMigration() {
  let pool;
  try {
    console.log('🔌 Connecting to database...');
    pool = await sql.connect(config);
    console.log('✅ Connected to database');

    // Create table
    console.log('\n📝 Creating admins table...');
    
    // Check if table exists
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'admins'
    `);
    
    if (tableCheck.recordset[0].count > 0) {
      console.log('ℹ️ Admins table already exists');
    } else {
      await pool.request().query(`
        CREATE TABLE admins (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          username NVARCHAR(100) NOT NULL UNIQUE,
          email NVARCHAR(255) NOT NULL UNIQUE,
          password_hash NVARCHAR(255) NOT NULL,
          full_name NVARCHAR(200) NOT NULL,
          role NVARCHAR(50) NOT NULL DEFAULT 'admin',
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
      `);
      console.log('✅ Admins table created successfully');
    }

    // Hash passwords
    const superAdminPass = await bcrypt.hash('SuperAdmin123!', 10);
    const adminPass = await bcrypt.hash('Admin123!', 10);
    
    console.log('\n👤 Creating default admin accounts...');
    
    // Create super admin
    const superAdminCheck = await pool.request()
      .input('username', sql.NVarChar, 'superadmin')
      .query('SELECT COUNT(*) as count FROM admins WHERE username = @username');
    
    if (superAdminCheck.recordset[0].count === 0) {
      await pool.request()
        .input('username', sql.NVarChar, 'superadmin')
        .input('email', sql.NVarChar, 'superadmin@forvismazars.com')
        .input('password_hash', sql.NVarChar, superAdminPass)
        .input('full_name', sql.NVarChar, 'Super Administrator')
        .input('role', sql.NVarChar, 'super_admin')
        .query(`
          INSERT INTO admins (username, email, password_hash, full_name, role, is_active)
          VALUES (@username, @email, @password_hash, @full_name, @role, 1)
        `);
      console.log('✅ Super admin created: superadmin / SuperAdmin123!');
    } else {
      console.log('ℹ️ Super admin already exists');
    }

    // Create regular admin
    const adminCheck = await pool.request()
      .input('username', sql.NVarChar, 'admin')
      .query('SELECT COUNT(*) as count FROM admins WHERE username = @username');
    
    if (adminCheck.recordset[0].count === 0) {
      await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .input('email', sql.NVarChar, 'admin@forvismazars.com')
        .input('password_hash', sql.NVarChar, adminPass)
        .input('full_name', sql.NVarChar, 'Regular Administrator')
        .input('role', sql.NVarChar, 'admin')
        .query(`
          INSERT INTO admins (username, email, password_hash, full_name, role, is_active)
          VALUES (@username, @email, @password_hash, @full_name, @role, 1)
        `);
      console.log('✅ Regular admin created: admin / Admin123!');
    } else {
      console.log('ℹ️ Regular admin already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Admin Accounts:');
    console.log('   Super Admin: superadmin / SuperAdmin123!');
    console.log('   Regular Admin: admin / Admin123!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
