// Update superadmin password
import { default as bcrypt } from 'bcrypt';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function updatePassword() {
  try {
    const newPassword = 'superadmin123!';
    
    console.log('🔐 Updating superadmin password in BOTH tables...\n');
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Connect to database
    const pool = await sql.connect(dbConfig);
    
    // Update password in admin_users table (used for login)
    await pool.request()
      .input('hash', sql.NVarChar, hashedPassword)
      .query(`UPDATE admin_users SET password_hash = @hash, updated_at = GETDATE() WHERE username = 'superadmin'`);
    
    console.log('✅ Updated password in admin_users table');
    
    // Update password in admins table (for super admin management)
    await pool.request()
      .input('hash', sql.NVarChar, hashedPassword)
      .query(`UPDATE admins SET password_hash = @hash, updated_at = GETDATE() WHERE username = 'superadmin'`);
    
    console.log('✅ Updated password in admins table\n');
    
    // Get the email from admin_users for login
    const result = await pool.request().query(`SELECT email FROM admin_users WHERE username = 'superadmin'`);
    const email = result.recordset[0]?.email || 'admin@safe8.com';
    
    console.log('🔐 Super Admin Login Credentials:');
    console.log('=====================================');
    console.log('   Username: superadmin');
    console.log(`   Email: ${email}`);
    console.log('   Password: superadmin123!');
    console.log('=====================================');
    console.log('\n💡 Use either username OR email to login\n');
    
    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePassword();
