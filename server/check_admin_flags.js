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

async function checkAdminFlag() {
  try {
    console.log('🔄 Connecting to database...');
    const pool = await sql.connect(dbConfig);

    // Check current value
    const result = await pool.request()
      .query(`
        SELECT username, email, must_change_password 
        FROM admin_users 
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
      `);
    
    console.log('\n📋 All Active Admins:');
    console.log('==========================================');
    result.recordset.forEach(admin => {
      console.log(`Username: ${admin.username}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Must Change Password: ${admin.must_change_password === 1 ? 'YES ✅' : 'NO ❌'}`);
      console.log('------------------------------------------');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAdminFlag();
