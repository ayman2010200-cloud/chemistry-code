# Chemistry Code — Production Completion Steps

This file lists exactly what remains for you to complete outside the codebase.

## What I added in this production pass

### Backend / database readiness
- `package.json` with `@supabase/supabase-js`
- `supabase/schema.sql`
- `api/_lib/supabaseAdmin.js`
- `api/subscriptions/activate.js`
- Payment endpoints can now activate Supabase subscriptions when Supabase environment variables are present.

### Public policies and SEO
- `privacy.html`
- `privacy-ar.html`
- `terms.html`
- `refund-policy.html`
- `robots.txt`
- `sitemap.xml`
- `404.html`

### Frontend helpers
- `js/site-config.js`
- `js/supabase-client.js`
- Final Revision search/filter inside Part One files.

---

# Step 1 — Create Supabase project

1. Go to https://supabase.com
2. Create a new project.
3. Open SQL Editor.
4. Copy and run:

```txt
supabase/schema.sql
```

This creates:

- profiles
- lessons
- questions
- quizzes
- files library
- activation codes
- subscriptions
- payment events
- certificates
- storage bucket
- RLS policies

---

# Step 2 — Add Vercel environment variables

Go to:

```txt
Vercel Dashboard → Project → Settings → Environment Variables
```

Add:

```env
NEXT_PUBLIC_SITE_URL=https://chemistry-code.com
SITE_URL=https://chemistry-code.com

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
ADMIN_API_SECRET=MAKE_A_LONG_RANDOM_SECRET
```

Payment variables:

```env
TAP_SECRET_KEY=sk_live_or_test_xxxxx

FAWRY_MERCHANT_CODE=xxxxx
FAWRY_SECURITY_KEY=xxxxx
FAWRY_API_BASE=https://atfawry.fawrystaging.com

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_CURRENCY=USD
PAYPAL_CONVERT_EGP_TO_USD=true
PAYPAL_EGP_TO_USD_RATE=50
```

After testing, change:

```env
PAYPAL_MODE=live
```

and use live PayPal credentials.

---

# Step 3 — Update browser Supabase config

Open:

```txt
js/site-config.js
```

Replace:

```js
SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co'
SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
```

The anon key is safe to be public when RLS is enabled.

---

# Step 4 — Deploy to Vercel

1. Push all files to GitHub.
2. Vercel will redeploy automatically.
3. If not, click **Redeploy** in Vercel.
4. Confirm API endpoints work:

```txt
https://chemistry-code.com/api/payments/paypal/config
```

---

# Step 5 — Test payments safely

Use sandbox/test mode first.

## PayPal
- Use sandbox buyer account.
- Open `pricing.html`.
- Select a paid plan.
- Select PayPal.
- Pay and confirm redirect to student dashboard.

## Tap
- Use Tap test secret key.
- Select Tap from pricing.
- Confirm checkout opens.

## Fawry
- Use Fawry staging credentials.
- Generate a reference number.
- Confirm callback with Fawry staging tools.

---

# Step 6 — Make first admin user

After creating your Supabase account user, set your profile role to admin in Supabase SQL Editor:

```sql
update profiles
set role = 'admin', plan = 'vip'
where email = 'YOUR_EMAIL@example.com';
```

---

# Step 7 — Production content/security checklist

Before launch:

- Replace placeholder model/part pages with real content.
- Upload PDFs/videos to Supabase Storage or another storage provider.
- Use signed URLs for private VIP files.
- Confirm payment webhooks are configured:
  - Tap: `https://chemistry-code.com/api/payments/tap/webhook`
  - Fawry: `https://chemistry-code.com/api/payments/fawry/callback`
- Keep service role key only in Vercel environment variables.
- Never put service role key in browser JavaScript.
- Test mobile/tablet layout again after real content upload.

---

# Step 8 — Recommended next upgrade

The current admin/student dashboards still have localStorage fallback. After Supabase credentials are added, the next recommended upgrade is replacing all dashboard CRUD with Supabase CRUD directly.

That will make:

- lessons
- files
- questions
- quizzes
- users
- activation codes

fully synchronized across all devices and browsers.
