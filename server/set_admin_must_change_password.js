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
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function setAdminMustChangePassword() {
  try {
    console.log('🔄 Connecting to database...');
    const pool = await sql.connect(dbConfig);

    // Set must_change_password=1 for the specific admin (JaredAdmin)
    const username = 'JaredAdmin'; // Change this to your username if different
    
    console.log(`📝 Setting must_change_password=1 for admin: ${username}`);
    
    await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        UPDATE admin_users 
        SET must_change_password = 1 
        WHERE username = @username
      `);
    
    await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        UPDATE admins 
        SET must_change_password = 1 
        WHERE username = @username
      `);

    console.log('✅ Updated must_change_password flag');
    
    // Verify the update
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT username, must_change_password 
        FROM admin_users 
        WHERE username = @username
      `);
    
    if (result.recordset.length > 0) {
      console.log('✅ Verification:', result.recordset[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdminMustChangePassword();
