# Cache Management Guide

## Problem Solved
If your database is not connecting or fetching data properly, this clears all caches and resets connections.

## Quick Cache Clear

### Method 1: Command Line (Recommended)
```powershell
cd server
npm run clear-cache
```

### Method 2: API Endpoint
```powershell
# While server is running
Invoke-RestMethod -Method POST -Uri "http://localhost:5001/api/clear-cache"
```

### Method 3: Direct Script
```powershell
cd server
node clearCache.js
```

## What Gets Cleared

1. **In-Memory Cache**
   - Clears all cached data (questions, industries, etc.)
   - Forces fresh database queries

2. **Database Connection Pool**
   - Closes all existing database connections
   - Creates fresh connection pool
   - Resolves stale connection issues

3. **Connection Test**
   - Verifies database is reachable
   - Confirms credentials are valid

## When to Use

Clear cache when:
- Database not connecting
- Data not updating/refreshing
- Stale data being returned
- After database schema changes
- After .env configuration changes
- After Azure SQL firewall updates

## Automatic Cache Clearing

The cache automatically clears on:
- Server restart
- Database connection errors
- After 5 minutes (TTL expiry)

## Verification

After clearing cache, check:
```powershell
# Test database connection
cd server
npm start

# Look for these logs:
✅ In-memory cache cleared
✅ Database pool reset
✅ Database connection test successful
```

## Troubleshooting

If cache clear fails:

1. **Check .env file exists** in `server/` folder
2. **Verify database credentials**:
   - DB_SERVER
   - DB_NAME
   - DB_USER
   - DB_PASSWORD

3. **Check Azure SQL firewall**:
   - Your IP must be whitelisted
   - OR "Allow Azure services" enabled

4. **Test connection manually**:
   ```powershell
   cd server
   node -e "import('./config/database.js').then(db => db.default.testConnection())"
   ```

## Production Use

In Azure App Service, use the API endpoint:
```bash
curl -X POST https://your-app.azurewebsites.net/api/clear-cache
```

Or restart the app service to clear all caches.
