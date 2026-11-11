# Ply — account setup, click by click

Do these in order. Total time: about 45 minutes. Everything here is free.

Dashboards rename buttons from time to time. If a label is slightly different from what is written here, pick the closest match — and tell me, so I can correct this file.

**Keep a private note open while you do this** (a password manager entry, not a file in the project). You will collect these values:

| Value                                   | Comes from                         |
| --------------------------------------- | ---------------------------------- |
| Supabase project URL                    | Part 2                             |
| Supabase publishable key                | Part 2                             |
| Supabase secret key                     | Part 2                             |
| Supabase callback URL                   | Part 2                             |
| Google client ID                        | Part 3                             |
| Google client secret                    | Part 3                             |
| Vercel app address                      | Part 5                             |
| VAPID keys, encryption key, cron secret | Part 6 (I generate these with you) |

Never paste secret values into the chat with me, into code, or into Git. They go only into the Vercel and Supabase dashboards.

---

## Part 1 — GitHub (where the code is saved)

Sessions like this one run on a temporary computer in the cloud. Anything not saved to GitHub disappears when the session ends, so this comes first.

1. Go to **github.com** and sign in (or create a free account).
2. Top right, click **+** → **New repository**.
3. Repository name: `ply`. Choose **Private**. Leave every checkbox unticked. Click **Create repository**.
4. Go to **claude.ai/connect-github** and connect your GitHub account. When asked which repositories Claude may access, choose **Only select repositories** and pick `ply`.
5. Start the next coding session with the `ply` repository selected (or tell me its name, `your-username/ply`, and I will try to attach it to this session).

---

## Part 2 — Supabase (database and sign-in)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. Click **New project**.
   - Name: `ply`
   - Database password: click **Generate a password**, then copy it into your private note.
   - Region: the one closest to you (for example Frankfurt for Europe).
   - Plan: **Free**.
3. Click **Create new project** and wait about two minutes.
4. In the left sidebar click **Project Settings** (gear icon) → **API Keys** (older projects: **API**). Copy into your private note:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`). If it is not on this page, it is under **Project Settings → Data API**.
   - **Publishable key** (starts with `sb_publishable_`; older projects call it `anon public`). This one is safe to be public.
   - **Secret key** (starts with `sb_secret_`; older projects call it `service_role`). This one is a real secret: it bypasses all security rules.
5. In the left sidebar click **Authentication** → **Sign In / Providers** → find **Google** in the list and click it.
6. Copy the **Callback URL** shown there (looks like `https://abcdefgh.supabase.co/auth/v1/callback`) into your private note. Leave this tab open; you come back to it in Part 4.

---

## Part 3 — Google Cloud (permission to read your calendar)

### 3a. Create the project

1. Go to **console.cloud.google.com** and sign in with the Google account whose calendar you want to use.
2. At the top of the page click the project picker (next to the Google Cloud logo) → **New project**.
3. Project name: `Ply`. Click **Create**. Wait for the notification, then click **Select project**.

### 3b. Turn on the Calendar API

1. Click the menu (three lines, top left) → **APIs & Services** → **Library**.
2. Search for `Google Calendar API`, click it, click **Enable**.

### 3c. Consent screen (what you see when you sign in)

1. Menu → **APIs & Services** → **OAuth consent screen**. This opens the **Google Auth Platform** page. Click **Get started**.
2. **App information:** App name `Ply`, User support email: your email. **Next**.
3. **Audience:** choose **External**. (Internal is only for company Google Workspace accounts.) **Next**.
4. **Contact information:** your email. **Next**. Tick the policy agreement → **Continue** → **Create**.
5. In the left menu click **Data Access** → **Add or remove scopes**. In the filter box type `calendar.readonly`, tick the row ending in `/auth/calendar.readonly` ("See and download any calendar you can access using your Google Calendar"). Click **Update**, then **Save**.
6. In the left menu click **Audience**. Under **Test users** click **Add users**, type your own Gmail address, click **Save**.

**What "Testing" mode means.** A new app starts with publishing status **Testing**. In this mode:

- Only the test users you listed can sign in (that is fine — it is just you).
- Google shows a "Google hasn't verified this app" screen at sign-in. Click **Continue**. That is expected for a personal app.
- **Important:** Google cancels the app's calendar permission every **7 days**. The app would show "Reconnect Google Calendar" once a week and background notifications would stop until you sign in again.

**How to avoid the weekly re-login (do this once sign-in works, in milestone 2):** on the **Audience** page click **Publish app** → **Confirm**. The status becomes **In production**. You do **not** need to submit the app for Google verification: an unverified app keeps working for up to 100 users, it just keeps showing the "hasn't verified" warning at sign-in. After publishing, the 7-day expiry no longer applies. Sign in to Ply once more afterwards so it receives a long-lived permission.

### 3d. Client credentials (the app's ID and password for Google)

1. In the left menu click **Clients** → **Create client**.
2. Application type: **Web application**. Name: `Ply web`.
3. **Authorized JavaScript origins** → **Add URI** → `http://localhost:3000`. (You add the Vercel address in Part 5.)
4. **Authorized redirect URIs** → **Add URI** → paste the **Supabase Callback URL** from Part 2, step 6.
5. Click **Create**. A box shows the **Client ID** and **Client secret**. Copy both into your private note now. Google may only show the secret this one time; if you lose it, open the client and click **Add secret** to make a new one.

---

## Part 4 — Connect Google to Supabase

1. Go back to the Supabase tab (**Authentication → Sign In / Providers → Google**).
2. Switch **Enable Sign in with Google** on.
3. Paste the **Client ID** and **Client Secret** from Part 3d.
4. Click **Save**.
5. Still under **Authentication**, click **URL Configuration**.
   - **Site URL:** `http://localhost:3000` for now (you change it in Part 5).
   - **Redirect URLs** → **Add URL** → `http://localhost:3000/**` → **Save**.

---

## Part 5 — Vercel (hosting)

Do this after milestone 1, when there is code in the GitHub repository.

1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub**. Choose the **Hobby** (free) plan.
2. Click **Add New…** → **Project**. Find `ply` in the list and click **Import**. (If it is not listed, click **Adjust GitHub App Permissions** and give Vercel access to the `ply` repository.)
3. Framework preset should say **Next.js** automatically. Do not change anything else.
4. Open **Environment Variables** and add each name from the table in Part 7 with its value. Leave all environments ticked.
5. Click **Deploy**. After a minute or two you get an address like `https://ply-xxxx.vercel.app`. Copy it into your private note. From now on, every time code is pushed to GitHub, Vercel updates the app by itself.

Now tell Google and Supabase about the new address:

6. **Google Cloud** → **Google Auth Platform** → **Clients** → `Ply web` → under **Authorized JavaScript origins** add your Vercel address (no slash at the end) → **Save**.
7. **Supabase** → **Authentication** → **URL Configuration** → set **Site URL** to your Vercel address, and under **Redirect URLs** add `https://your-address.vercel.app/**` → **Save**. Keep the localhost entry too.

To change a variable later: Vercel → your project → **Settings** → **Environment Variables**. After changing one, go to **Deployments** → the three dots on the newest deployment → **Redeploy**, otherwise the app keeps using the old value.

---

## Part 6 — Generated secrets (VAPID keys, encryption key, cron secret)

These are not from any dashboard; they are random values created by a command. I will run the commands with you in milestone 6 (VAPID) and milestone 2 (encryption key), and you copy the output into Vercel. For reference, the commands are:

VAPID keys for push notifications (prints a public and a private key):

```bash
npx web-push generate-vapid-keys
```

Encryption key for the stored Google permission:

```bash
openssl rand -base64 32
```

Cron secret (run the same kind of command again for a different value):

```bash
openssl rand -hex 32
```

If you would rather not use a terminal at all, tell me and I will add a small one-time page that generates them in your browser.

The cron secret is also stored in Supabase so its scheduler can call the app: Supabase → **Integrations** → **Vault** → **Add new secret**, name `cron_secret`. I will give you the exact steps in milestone 6, together with enabling **Cron** under **Integrations**.

---

## Part 7 — All environment variables in one place

| Name                                   | Value                                           | Needed from |
| -------------------------------------- | ----------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project URL                            | Milestone 2 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                        | Milestone 2 |
| `SUPABASE_SECRET_KEY`                  | Supabase secret key                             | Milestone 2 |
| `GOOGLE_CLIENT_ID`                     | Google client ID                                | Milestone 2 |
| `GOOGLE_CLIENT_SECRET`                 | Google client secret                            | Milestone 2 |
| `TOKEN_ENCRYPTION_KEY`                 | Output of the `openssl rand -base64 32` command | Milestone 2 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`         | VAPID public key                                | Milestone 6 |
| `VAPID_PRIVATE_KEY`                    | VAPID private key                               | Milestone 6 |
| `VAPID_SUBJECT`                        | `mailto:` followed by your email address        | Milestone 6 |
| `CRON_SECRET`                          | Output of the `openssl rand -hex 32` command    | Milestone 6 |

Names starting with `NEXT_PUBLIC_` are visible to anyone using the app, which is fine for those values. Everything else stays on the server only.

---

## Part 8 — Phone install (milestone 6)

**iPhone:** open the Vercel address in **Safari** (not Chrome) → tap the **Share** button → **Add to Home Screen** → **Add**. Open Ply from the home screen icon, then allow notifications when asked. On iPhone, notifications only work from the installed home-screen app, never from a Safari tab.

**Android:** open the Vercel address in **Chrome** → tap the three dots → **Install app** (or **Add to Home screen**) → **Install**. Open Ply from the icon and allow notifications.
