# Vercel Deployment Guide for CRM System

## Critical: Required Environment Variables

The application **WILL NOT WORK** on Vercel without these environment variables configured.

### Step 1: Add Environment Variables in Vercel Dashboard

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add the following variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NEXTAUTH_SECRET` | `crm_secret_2026_production_key` | Any random long string (32+ characters) |
| `MYSQL_HOST` | `srv1990.hstgr.io` | From Hostinger hPanel |
| `MYSQL_USER` | `u411473095_crmdata` | From Hostinger hPanel |
| `MYSQL_PASSWORD` | `Tdc@0712` | Your actual MySQL password |
| `MYSQL_DATABASE` | `u411473095_crmdata` | From Hostinger hPanel |

**Important:** After adding these variables, you MUST **redeploy** the application for them to take effect.

### Step 2: Whitelist Vercel IP in Hostinger

Vercel uses dynamic IP addresses, so you need to allow all IPs:

1. Go to **Hostinger hPanel** → **Databases** → **Remote MySQL**
2. Add the following entries:
   - IP Address: `%` (allows all IPs)
   - Database: `u411473095_crmdata`
   - Click **Create**

### Step 3: Verify Deployment

After redeploying:

1. Visit your site: `https://crm-eight-ashen.vercel.app`
2. Try to log in
3. If you still see errors, check **Vercel Dashboard** → **Logs** for specific error messages

## Common Issues

### "Server error - Check server logs"
- **Cause:** Missing `NEXTAUTH_SECRET` environment variable
- **Fix:** Add `NEXTAUTH_SECRET` in Vercel settings and redeploy

### "500 Internal Server Error" during login
- **Cause:** Database connection timeout (Hostinger blocking Vercel)
- **Fix:** Add `%` to Remote MySQL allowed IPs in Hostinger

### "ECONNREFUSED" or "Connection timeout"
- **Cause:** Hostinger firewall blocking connection
- **Fix:** Verify Remote MySQL settings in Hostinger hPanel

## Debugging

To see detailed error logs:

1. Go to **Vercel Dashboard** → **Deployments**
2. Click on the latest deployment
3. Click **Functions** tab
4. Look for errors containing:
   - `DB_DIAGNOSTIC`
   - `CRITICAL`
   - `Auth process error`
