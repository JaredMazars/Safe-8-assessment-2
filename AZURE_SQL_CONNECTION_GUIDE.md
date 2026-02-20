# Azure SQL Connection Guide - When Firewall Access is Restricted

## Current Problem
Your Azure App Service cannot connect to Azure SQL Server because:
- SQL Server has "Deny Public Network Access" enabled
- You don't have permissions to modify SQL Server firewall settings

## Solution Options (Ranked by Ease)

### ✅ Option 1: Request Firewall Rule from SQL Admin (EASIEST)

**What you need:**
1. Get your App Service outbound IP addresses
2. Request SQL admin to add them to the firewall

**Steps:**
1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your App Service
3. Click "Properties" (left sidebar)
4. Find "Outbound IP addresses" - Copy ALL of them
5. Send these IPs to your SQL Server administrator

**What to send to SQL Admin:**
```
Hi,

I need the following IP addresses added to the SQL Server firewall for "zaf-sql-d-weur":

[Paste your outbound IPs here]

These are the outbound IPs from our Azure App Service that needs to connect to the database.

Alternatively, please enable "Allow Azure services and resources to access this server" 
in the SQL Server Networking settings.

Thank you!
```

---

### ✅ Option 2: Use VNet Integration with Private Endpoint (MOST SECURE)

**Requirements:**
- You need access to configure your App Service
- SQL admin needs to create a Private Endpoint

**Your Steps (App Service side):**
1. Azure Portal → Your App Service
2. Navigate to: **Networking** → **VNet integration**
3. Click: **+ Add VNet integration**
4. Create or select a VNet (e.g., "safe8-vnet")
5. Create a subnet for App Service (e.g., "appservice-subnet")
6. Click **OK**

**SQL Admin Steps:**
1. Azure Portal → SQL Server "zaf-sql-d-weur"
2. Navigate to: **Networking** → **Private endpoint connections**
3. Click: **+ Private endpoint**
4. Select the SAME VNet you used above
5. This creates a private DNS zone

**Update Connection String:**
Replace your DB_SERVER in the App Service configuration:
```
# Instead of public endpoint:
DB_SERVER=zaf-sql-d-weur.database.windows.net

# Use private endpoint (example):
DB_SERVER=zaf-sql-d-weur.privatelink.database.windows.net
```

---

### ✅ Option 3: Use Managed Identity with Azure AD Authentication (MODERN)

This completely bypasses IP restrictions!

**Prerequisites:**
- SQL admin must grant your App Service Managed Identity access to the database

**Step 1: Enable Managed Identity on App Service**
1. Azure Portal → Your App Service
2. Navigate to: **Identity** (left sidebar)
3. Under **System assigned** tab
4. Toggle **Status** to **On**
5. Click **Save**
6. Copy the **Object (principal) ID** that appears

**Step 2: Request SQL Admin to Run This**
Send this to your SQL admin:

```sql
-- Connect to your database: SAFE8-2026-2-4-13-5
-- Replace <app-service-name> with your App Service name
-- Replace <object-id> with the Object ID from Step 1

CREATE USER [<app-service-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<app-service-name>];
ALTER ROLE db_datawriter ADD MEMBER [<app-service-name>];
ALTER ROLE db_ddladmin ADD MEMBER [<app-service-name>];
GO
```

**Step 3: Update Your Database Connection Code**

Modify `server/config/database.js`:

```javascript
import sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: 1433,
  authentication: {
    type: 'azure-active-directory-default',
    options: {
      credential: new DefaultAzureCredential()
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// Remove DB_USER and DB_PASSWORD - not needed!
```

**Step 4: Install Required Package**
```bash
cd server
npm install @azure/identity
```

**Step 5: Remove Username/Password from Environment Variables**
In Azure App Service Configuration, you can remove:
- DB_USER
- DB_PASSWORD

Keep only:
- DB_SERVER
- DB_NAME

---

### ✅ Option 4: Use Connection String from SQL Admin

Request your SQL admin to provide you with:
1. A connection string with proper permissions
2. Or a different SQL user that has access through the firewall

---

## Recommended Approach

**For immediate access:**
→ Use **Option 1**: Get your outbound IPs and send to SQL admin

**For long-term security:**
→ Use **Option 3**: Managed Identity (no passwords, more secure, bypasses firewall issues)

**For maximum security:**
→ Use **Option 2**: VNet + Private Endpoint (traffic never leaves Azure network)

---

## Quick Check: Find Your App Service Name

Run this to help identify your app:
```powershell
# If Azure CLI is installed:
az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup, State:state}" -o table
```

Or look in your deployment logs/terminal history for the App Service URL.

---

## Testing After Configuration

Once access is granted, your app should automatically reconnect. Check logs:
1. Azure Portal → App Service → **Log stream**
2. Look for: "✅ Database connected successfully"
3. If still failing, restart: App Service → **Restart**

---

## Need Help?

If none of these options work, you'll need to:
1. Contact your Azure administrator
2. Request proper permissions for the SQL Server
3. Or request a dedicated SQL user with whitelisted access
