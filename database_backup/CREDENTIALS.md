# SAFE-8 Database Credentials & Quick Reference

## 🔐 Azure Production Database (Original)

**Connection Details:**
- Server: `safe-8-server.database.windows.net`
- Database: `safe-8-db`
- Port: `1433`
- User: `safe8admin`
- Password: `Safe8Admin2024!`
- Encryption: Required (SSL/TLS)

**Connection String:**
```
Server=tcp:safe-8-server.database.windows.net,1433;Initial Catalog=safe-8-db;Persist Security Info=False;User ID=safe8admin;Password=Safe8Admin2024!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

**Environment Variables (.env):**
```env
DB_SERVER=safe-8-server.database.windows.net
DB_NAME=safe-8-db
DB_USER=safe8admin
DB_PASSWORD=Safe8Admin2024!
DB_INTEGRATED_SECURITY=false
```

---

## 💻 Local Development Database

**Connection Details:**
- Server: `localhost` (or `.\SQLEXPRESS`)
- Database: `SAFE8_Local`
- Authentication: Windows Authentication (Integrated Security)
- No username/password needed

**Connection String (Windows Auth):**
```
Server=localhost;Database=SAFE8_Local;Integrated Security=True;
```

**Connection String (SQL Auth - if configured):**
```
Server=localhost;Database=SAFE8_Local;User ID=sa;Password=YourSaPassword;
```

**Environment Variables (.env):**
```env
DB_SERVER=localhost
DB_NAME=SAFE8_Local
DB_USER=
DB_PASSWORD=
DB_INTEGRATED_SECURITY=true
```

---

## 👤 Admin Portal Login

### Production (Azure)
- **URL**: https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net/admin/login
- **Username**: `admin`
- **Email**: `admin@forvismazars.com`
- **Password**: `Admin123!`
- **Role**: admin

### Super Admin Accounts
**Account 1:**
- **Username**: `superadmin`
- **Email**: `superadmin@forvismazars.com`
- **Password**: `Admin123!`
- **Role**: super_admin

**Account 2:**
- **Username**: `jared`
- **Email**: `jared.moodley@mazars.co.za`
- **Password**: `Admin123!`
- **Role**: super_admin

### Local Development
- **URL**: http://localhost:8080/admin/login
- **Credentials**: Same as above
- **Note**: Database must be created first using `create_local_database.sql`

---

## 📧 Email Configuration

### Gmail SMTP (Current Setup)
```env
EMAIL_USER=jared.moodley@mazars.co.za
EMAIL_PASSWORD=egwo becy ycxu apbn
EMAIL_FROM=jared.moodley@mazars.co.za
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**App Password**: `egwo becy ycxu apbn` (Google App Password - no spaces when using)

---

## 🔑 Security Secrets

### Session & CSRF
```env
SESSION_SECRET=safe8-secret-key-change-in-production-min-32-chars
CSRF_SECRET=csrf-secret-key-for-safe8-must-be-at-least-32-characters-long
```

### JWT (if used)
```env
JWT_SECRET=your-jwt-secret-key-here-should-be-long-and-random
```

---

## 🌐 Application URLs

### Production
- **Main App**: https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net
- **API**: https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net/api
- **Admin**: https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net/admin/login
- **Health Check**: https://safe-8-assessment-d8cdftfveefggkgu.canadacentral-01.azurewebsites.net/health

### Local Development
- **Main App**: http://localhost:5173 (Vite dev server)
- **API**: http://localhost:8080/api
- **Admin**: http://localhost:8080/admin/login
- **Health Check**: http://localhost:8080/health

---

## 📊 Test User Accounts

### User Account (Example)
Create test users through the admin portal (recommended) or use the API:

**Option 1: Admin Portal**
1. Login to admin dashboard
2. Navigate to Users → Add User
3. Enter user details and generate secure password

**Option 2: API Endpoint**
```bash
# Use the admin API to create users (requires authentication)
curl -X POST http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact_name": "Test User",
    "email": "test@example.com",
    "company_name": "Test Company",
    "industry": "Technology"
  }'
# Password will be auto-generated and sent via email
```

**Option 3: Server Script**
```javascript
// server/create_test_user.js
const bcrypt = require('bcrypt');
const database = require('./config/database');

const password = 'YourSecurePassword123!';
const hash = await bcrypt.hash(password, 12);

await database.query(
  `INSERT INTO leads (contact_name, email, password_hash, company_name, industry, is_email_verified)
   VALUES (?, ?, ?, ?, ?, 1)`,
  ['Test User', 'test@example.com', hash, 'Test Company', 'Technology']
);
```

---

## 🛠️ Database Management Tools

### SQL Server Management Studio (SSMS)
- Download: https://aka.ms/ssmsfullsetup
- Connect to `localhost` with Windows Authentication
- Or connect to Azure with SQL Authentication

### sqlcmd Command Line
```powershell
# Connect to local database
sqlcmd -S localhost -E -d SAFE8_Local

# Connect to Azure
sqlcmd -S safe-8-server.database.windows.net -U safe8admin -P Safe8Admin2024! -d safe-8-db

# Run script
sqlcmd -S localhost -E -i create_local_database.sql
```

### Azure Data Studio
- Modern cross-platform tool
- Download: https://aka.ms/azuredatastudio
- Supports both Windows Auth and SQL Auth

---

## 📝 Quick Commands

### Create Local Database
```powershell
cd database_backup
sqlcmd -S localhost -E -i create_local_database.sql
```

### Test Connection
```powershell
cd database_backup
.\test_connection.ps1
```

### Backup Azure Database
```powershell
cd server
node backup_database.js
```

### Start Local Server
```powershell
cd server
node index.js
```

### Start Frontend Dev Server
```powershell
npm run dev
```

---

## 🔍 Troubleshooting

### Cannot Connect to SQL Server
1. Check service is running:
   ```powershell
   Get-Service MSSQLSERVER
   # Or for Express:
   Get-Service MSSQL$SQLEXPRESS
   ```

2. Start if stopped:
   ```powershell
   Start-Service MSSQLSERVER
   ```

3. Test connection:
   ```powershell
   .\test_connection.ps1
   ```

### Password Reset for Admin
If you forget admin password, use the password reset script:

**Option 1: Use Reset Script (Recommended)**
```bash
# Run the password reset script
node server/reset_admin_password.js
```

**Option 2: Manual Reset with Node.js**
```javascript
// reset_password.js
const bcrypt = require('bcrypt');
const sql = require('mssql');

const newPassword = 'YourNewSecurePassword123!';
const hash = await bcrypt.hash(newPassword, 12);

const pool = await sql.connect(dbConfig);
await pool.request()
  .input('hash', sql.NVarChar, hash)
  .query(`
    UPDATE admin_users 
    SET password_hash = @hash,
        must_change_password = 1,
        login_attempts = 0,
        locked_until = NULL
    WHERE username = 'admin'
  `);

console.log('Password reset successfully!');
```

**⚠️ SECURITY WARNING**: Never use SQL UPDATE statements with hardcoded password hashes in documentation or scripts that could be committed to version control!

### Email Not Sending
1. Check Gmail settings allow "Less secure app access" or use App Password
2. Verify EMAIL_PASSWORD in .env matches the app password
3. Check firewall allows outbound SMTP (port 587)

---

## 📚 Additional Resources

- [SQL Server Express Download](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
- [SSMS Download](https://aka.ms/ssmsfullsetup)
- [Node.js MSSQL Driver Docs](https://www.npmjs.com/package/mssql)
- [Azure SQL Documentation](https://docs.microsoft.com/en-us/azure/azure-sql/)

---

## ⚠️ Security Reminders

1. **Never commit** `.env` files to source control
2. **Change default passwords** in production
3. **Rotate secrets** regularly
4. **Use environment variables** for all credentials
5. **Enable MFA** on Azure and email accounts
6. **Review access logs** periodically

---

**Last Updated**: $(Get-Date -Format "yyyy-MM-dd")
**Document Version**: 1.0
