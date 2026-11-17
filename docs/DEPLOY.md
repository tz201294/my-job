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

---

## Good to know

- **The first visit after a quiet period is slow** (up to about a minute) on Render's free plan. That's the server
  waking up, not a bug.
- **Updates deploy themselves.** Every push to `master` redeploys the API on Render (after CI) and the website on
  GitHub Pages.
- **Logs:** Render dashboard → **prologue-api** → **Logs**.
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
- **Background tasks or more than one API instance:** move the login rate limit to Redis first (see
  ROADMAP.md).

## Going back to the demo

Delete the `VITE_API_URL` variable in GitHub and re-run the **Deploy Prologue to GitHub Pages** workflow. The
website becomes the in-browser demo again. The API and the database keep running and keep their data.
