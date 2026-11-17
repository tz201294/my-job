# Putting Prologue online (free)

This sets up the real app for free:

| Part | Where | Free plan |
|---|---|---|
| Website | GitHub Pages (already running) | Free |
| API (backend) | **Render** web service | Free. Sleeps after ~15 minutes without visitors; the next visit waits up to about a minute while it wakes up (the app shows a "Waking up the server…" message). |
| Database | **Neon** Postgres | Free. 0.5 GB storage, which is plenty to start. |

Why not Render's own database? Render's free Postgres is deleted after 30 days. Neon's free database doesn't expire.

> Free-plan limits change from time to time. Check render.com/pricing and neon.tech/pricing for the current terms.

Everything the hosts need is already in the repo: `render.yaml` describes the API service, and the deploy
workflow reads the API address from a GitHub setting. The steps below take about 20 minutes.

---

## 1. Create the database (Neon)

1. Go to **neon.tech** and sign up (signing in with GitHub is easiest).
2. Create a project:
   - **Name:** `prologue`
   - **Region:** **AWS Europe Central (Frankfurt)**, the same region as the API.
   - **Postgres version:** leave the default.
3. On the project dashboard, open **Connect** (or **Connection details**).
   - Turn **Connection pooling off**. The app needs the *direct* address, the one *without* `-pooler` in the
     host name.
   - Copy the connection string. It looks like:
     `postgresql://neondb_owner:xxxx@ep-something-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it somewhere safe for the next step. **It contains the database password; never put it in the repo.**

You don't need to create any tables: the API creates them itself on its first start.

## 2. Create the API (Render)

1. Go to **render.com** and sign up **with GitHub**, so Render can see the `my-job` repository.
2. Click **New** → **Blueprint**.
3. Choose the **my-job** repository. Render finds `render.yaml` and shows one service, **prologue-api** (free plan,
   Frankfurt).
4. Render asks for the one value it can't know: **DATABASE_URL**. Paste the Neon connection string from step 1
   exactly as Neon gave it. The app converts it to the format it needs.
5. Click **Apply** / **Deploy Blueprint**. The first build takes about 5–10 minutes.
6. When it says **Live**, copy the service address at the top of the page, for example
   `https://prologue-api.onrender.com`. If that name was taken, Render adds a suffix; use whatever it shows.
7. Check it works by opening these in your browser:
   - `https://<your-address>/health` should show `{"status":"healthy", ...}`.
   - `https://<your-address>/api/v1/docs` shows the API documentation page.

Render also created a random `SECRET_KEY` for you and keeps it. If anything is missing or unsafe, the API refuses
to start and the **Logs** tab says exactly what to fix.

## 3. Point the website at the API (GitHub)

1. In the **my-job** repository on GitHub: **Settings** → **Secrets and variables** → **Actions** →
   **Variables** tab → **New repository variable**.
   - **Name:** `VITE_API_URL`
   - **Value:** your Render address followed by `/api/v1`, for example `https://prologue-api.onrender.com/api/v1`
2. **Actions** tab → **Deploy Prologue to GitHub Pages** → **Run workflow** (branch `master`).
3. When it turns green, open **https://tz201294.github.io/my-job/**. You should see the normal login page
   *without* the "Demo mode" box. **Sign up** to create the first real account.

The site is now the real app: accounts and posts are stored in your Neon database. There are no demo accounts in
production; everyone signs up.

**The demo stays online** at **https://tz201294.github.io/my-job/demo/**, with all the sample accounts, posts and
comments (password `demo1234`). It runs entirely in the visitor's browser and never touches the real database.
The real login page shows a "Try the demo" link, and the demo links back to the real app. Each keeps its own
login, so trying the demo doesn't sign anyone out of their real account.

## 4. Get told when something breaks (free, about 15 minutes)

Optional, but strongly recommended before inviting people. Without it, you only find out about problems when
someone tells you.

### Errors: Sentry

Sentry emails you when the app crashes (the "Something went wrong" screen) or the API hits an unexpected error,
with the stack trace needed to fix it. The free plan covers 5,000 errors a month. The app sends no personal data:
no passwords, post text, login tokens or IP addresses.

1. Go to **sentry.io** and sign up (the free **Developer** plan).
2. Create two projects:
   - Platform **FastAPI**, name `prologue-api`.
   - Platform **React**, name `prologue-web`.

   Skip the setup instructions Sentry shows; the code is already in place.
3. **Settings** → **Security & Privacy**: turn on **Prevent Storing of IP Addresses**, as an extra safety net.
4. For each project, **Settings** → **Client Keys (DSN)**: copy the DSN, an address like
   `https://abc123@o456.ingest.de.sentry.io/789`.
5. **API:** Render → **prologue-api** → **Environment** → set **SENTRY_DSN** to the `prologue-api` DSN → **Save**.
   Render redeploys by itself.
6. **Website:** GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository
   variable**: name `VITE_SENTRY_DSN`, value the `prologue-web` DSN. Then re-run the **Deploy Prologue to GitHub
   Pages** workflow. (The website's DSN isn't a secret: it ends up in the page anyway.)

Errors from the demo are reported too, under the environment **demo**, so you can tell them apart from the real
app's (**production**). Sentry emails you about every new kind of error by default; **Alerts** changes that.

To switch it off, delete the value in Render and the variable in GitHub (then re-run the deploy).

### Downtime: UptimeRobot

UptimeRobot checks the API every few minutes and emails you when it stops answering, and again when it's back.

1. Go to **uptimerobot.com** and sign up (free plan).
2. **New monitor** → **HTTP(s)**:
   - **URL:** `https://<your-address>/health`
   - **Interval:** 5 minutes
   - **Alert contact:** your email
3. Optionally a second monitor for the database:
   - **URL:** `https://<your-address>/health/db`
   - **Interval:** **60 minutes**

   It answers with an error if the API can't reach the database. Keep it hourly: every check wakes the database up,
   and the free Neon plan has a monthly compute allowance. `/health` never touches the database, so checking it
   every 5 minutes is fine.

Side effect of the 5-minute check: Render's free service never goes to sleep, so visitors don't wait for it to wake
up. Render's free plan includes 750 hours a month, enough for one service running all month.

---

## Good to know

- **The first visit after a quiet period is slow** (up to about a minute) on Render's free plan. That's the server
  waking up, not a bug. The UptimeRobot check in step 4 keeps it awake.
- **Updates deploy themselves.** Every push to `master` redeploys the API on Render (after CI) and the website on
  GitHub Pages.
- **Logs:** Render dashboard → **prologue-api** → **Logs**. Errors with stack traces: Sentry (step 4).
- **If the site says "Can't reach the Prologue server":** check that the Render service is Live and that
  `VITE_API_URL` has no typo (it must end in `/api/v1`).
- **CORS:** the API only accepts requests from `https://tz201294.github.io` (set in `render.yaml`). If you later
  use your own domain, add it there.

## Moving to a paid plan later

Nothing in the code or the addresses changes.

- **API always on (no sleeping):** Render dashboard → **prologue-api** → **Settings** → **Instance Type** → choose
  **Starter**. Then also change `plan: free` to `plan: starter` in `render.yaml`, so the blueprint matches.
- **More database space or features:** upgrade the plan in the Neon console. The connection string stays the
  same.
- **Background tasks or more than one API instance:** move the login and spam limits to Redis first (see
  ROADMAP.md).

## Going back to the demo

Delete the `VITE_API_URL` variable in GitHub and re-run the **Deploy Prologue to GitHub Pages** workflow. The
main address becomes the in-browser demo again (`/demo/` always is). The API and the database keep running and
keep their data.
