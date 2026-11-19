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
     host name. This is on purpose: Neon's pooler (PgBouncer in transaction mode) doesn't keep *prepared
     statements* between transactions, and the app's database driver (asyncpg) relies on them, so with pooling on,
     requests fail with errors like `prepared statement "..." does not exist`. The app keeps its own small pool
     instead (5 connections, up to 10 under load), well within the free plan.
   - Copy the connection string. It looks like:
     `postgresql://neondb_owner:xxxx@ep-something-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Keep it somewhere safe for the next step. **It contains the database password; never put it in the repo.**

You don't need to create any tables: the API creates them itself on its first start.

## 2. Create the API (Render)

1. Go to **render.com** and sign up **with GitHub**, so Render can see the `my-job` repository.
2. Click **New** → **Blueprint**.
3. Choose the **my-job** repository. Render finds `render.yaml` and shows one service, **prologue-api** (free plan,
   Frankfurt).
4. Render asks for the values it can't know:
   - **DATABASE_URL:** paste the Neon connection string from step 1 exactly as Neon gave it. The app converts it to
     the format it needs.
   - **BREVO_API_KEY**, **EMAIL_FROM**, **SENTRY_DSN** and **CLOUDINARY_URL:** leave these empty for now. Steps 4, 5
     and 8 fill them in.
   - **ADMIN_USERNAMES:** leave empty for now. Step 7 fills it in once you have an account.
5. Click **Apply** / **Deploy Blueprint**. The first build takes about 5–10 minutes.
6. When it says **Live**, copy the service address at the top of the page, for example
   `https://prologue-api.onrender.com`. If that name was taken, Render adds a suffix; use whatever it shows.
7. Check it works by opening these in your browser:
   - `https://<your-address>/health` should show `{"status":"healthy", ...}`.
   - `https://<your-address>/health/db` should show that the database answers.

   The interactive API documentation (`/api/v1/docs`) is switched off on the live server, so it doesn't list every
   endpoint to strangers. Run the API locally (README) to browse it.

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
up.

**Watch the free hours.** Render's free plan gives **750 instance hours a month per workspace, shared by all its
free services**. A service kept awake all month uses 720–744 of them, nearly all. That's fine with this one
service, but if you add a second free service to the same workspace (a staging copy, say), the hours run out
before the month ends and Render suspends the free services until the next month. Then either upgrade the API to
a paid instance (it no longer counts against free hours) or set this check to **30 minutes or more**, so the
service may sleep after 15 quiet minutes (the first visit after that waits for it to wake up).

## 5. Send emails: password reset and email confirmation (free, about 15 minutes)

Without this the app works, but no emails go out. That means nobody can confirm their email address, and so
nobody can reset a forgotten password. The API refuses nothing; it just writes the emails to its log.

Prologue sends through **Brevo**: its free plan allows 300 emails a day, and it can send from an address you
already have (such as a Gmail address) without owning a domain. It's used through Brevo's web API, because
Render's free plan blocks the usual email ports.

1. Go to **brevo.com** and sign up (free plan). If Brevo asks you to complete your profile or activate your
   account before sending, do that first.
2. **Senders, domains & dedicated IPs** → **Senders** → **Add a sender**:
   - **From name:** `Prologue`
   - **From email:** the address emails should come from (for example your Gmail address)

   Brevo emails that address a code to prove it's yours; enter it.
3. **SMTP & API** → **API Keys** → **Generate a new API key**, name `prologue-api`. Copy the key (it starts with
   `xkeysib-`). Brevo shows it only once.
4. Render → **prologue-api** → **Environment**:
   - **BREVO_API_KEY:** the key from step 3
   - **EMAIL_FROM:** the sender address from step 2

   Then **Save**. Render redeploys by itself.
5. Try it: on the site, go to **Settings** → **Edit**, add your own email and save. The email should arrive
   within a minute (check the spam folder too). Click **Confirm my email**, and Settings shows **Confirmed**. Then
   log out, choose **Forgot password?**, and you should get a reset link.

If no email arrives: Render → **prologue-api** → **Logs** shows what Brevo answered (for example "sender not
valid"). Brevo's dashboard also lists every email it sent under **Transactional** → **Logs**.

**Good to know:**
- **A Gmail sender is for testing only.** Gmail and other big providers check DMARC: an email that says it's from
  an `@gmail.com` address but is sent by Brevo fails that check, so it often lands in spam or is rejected. **Before
  real users sign up**, send from a domain you own: in Brevo, **Senders, domains** → **Domains** → add your domain,
  add the DNS records Brevo shows (**SPF** and **DKIM**, plus a **DMARC** record, at your domain registrar), wait for
  Brevo to show them as verified, then change **EMAIL_FROM** in Render to an address at that domain (for example
  `no-reply@your-domain.com`).
- Links in the emails point to `FRONTEND_URL` (set in `render.yaml` to `https://tz201294.github.io/my-job`). If
  the website moves to its own domain, change it there.
- How it works: a reset link works for 60 minutes and only once. A confirmation link works for 7 days.
  Reset links are only sent to confirmed addresses, so a typo in someone's email can't hand their account to a
  stranger. "Forgot password" answers the same whether or not an account exists.

## 6. A contact address for the Privacy Policy and Terms (2 minutes)

The [Privacy Policy](https://tz201294.github.io/my-job/privacy) and [Terms](https://tz201294.github.io/my-job/terms)
tell people where to write with questions about their data. Until you set an address, they say "the contact address
published on this page", which isn't good enough once real people sign up.

1. GitHub → **Settings** → **Secrets and variables** → **Actions** → **Variables** → **New repository variable**:
   name `VITE_CONTACT_EMAIL`, value the address people should write to (it will be shown publicly on those pages;
   a separate address just for Prologue is a good idea).
2. Re-run the **Deploy Prologue to GitHub Pages** workflow.

**Before inviting people, have the two pages read by someone who knows the law where you are.** They were written to
fit what Prologue actually does (what it stores, which services it uses, people's rights under the GDPR), but they
are not legal advice. Things worth checking: the minimum age, who is named as responsible for the data (the
"controller", usually you or your company, with an address), and which country's law applies. The text is in
`frontend/src/components/LegalPages.jsx`. When you change it in a way people must agree to again, also change
`TERMS_VERSION` in `backend/app/core/legal.py`.

## 7. Make yourself a moderator (2 minutes)

Moderators get a **Moderation** page in the menu. It lists what people reported, grouped by post, comment,
question, challenge, idea or account, with the reasons and notes. For each one you can:
- **Remove** the content;
- **Suspend** its author, who then can't log in and whose content is hidden everywhere until you lift it (under
  **Suspended**);
- mark it **Nothing wrong**.

1. Sign up on the site with the account you'll use.
2. Render → **prologue-api** → **Environment** → **ADMIN_USERNAMES** = `["your_username"]` (with the brackets and
   quotes; for several moderators: `["you", "a_friend"]`) → **Save**. Render redeploys by itself.
3. Reload the site. **Moderation** appears in the menu.

Everyone else can **report** posts, comments, questions, challenges, ideas and accounts (the flag button), and
**block** accounts from their profile. Blocked accounts are listed in **Settings**, where they can be unblocked.
Nobody is told who reported or blocked them.

## 8. Photo uploads (free, about 10 minutes)

Without this, people can only add photos by pasting a link (the Upload button doesn't appear). Photos are stored on
**Cloudinary**, because Render's free plan has no lasting disk. Cloudinary's free plan needs no credit card and is
plenty to start (25 monthly "credits", roughly 25 GB of storage or traffic).

Before a photo is stored, the API checks it really is an image, turns phone photos the right way up, shrinks it (at
most 1600 px, profile photos 512 px) and removes everything hidden in the file, such as the GPS location where it was
taken. Uploads are limited to 10 MB and 30 an hour per person.

1. Go to **cloudinary.com** and sign up (free plan).
2. On the dashboard (**Programmable Media** → **Dashboard**, or **Settings** → **API Keys**), copy the
   **API environment variable**. It looks like `cloudinary://123456789012345:AbCdEf...@your-cloud-name`. It contains
   a secret: never put it in the repo.
3. Render → **prologue-api** → **Environment** → **CLOUDINARY_URL** = that value (without `CLOUDINARY_URL=` in
   front) → **Save**. Render redeploys by itself.
4. Try it: on the site, **Post** → **Upload photo**. The photo appears in **Media Library** → folder **prologue** on
   Cloudinary.

Good to know: photos are deleted from Cloudinary when nothing uses them any more: when the post, story or account
they belong to is deleted (by its owner or a moderator), or when a cover, step photo or profile photo is replaced.
Links to photos on other sites are never touched. Stories that simply expired after 24 hours keep their photo.

## 9. Nightly backups (free, about 5 minutes)

Neon's free plan can only roll the database back a short way. So every night GitHub makes a full copy of the
database, checks it can be read, **encrypts it with a passphrase only you know** and keeps it for 30 days. The
encryption matters: this repository is public, and anyone signed in to GitHub can download its stored files.

1. **Make up a long passphrase** (a few unrelated words is good) and keep it in your password manager. Without it
   nobody can open the backups, including you; GitHub can't recover it.
2. GitHub → **Settings** → **Secrets and variables** → **Actions** → the **Secrets** tab (not Variables) →
   **New repository secret**, twice:
   - **BACKUP_DATABASE_URL:** the Neon connection string, the same one Render has as `DATABASE_URL`;
   - **BACKUP_PASSPHRASE:** the passphrase from step 1.
3. Try it: **Actions** → **Database backup** → **Run workflow**. After a minute or two the run turns green, and at
   the bottom of its page, under **Artifacts**, there is a file named `prologue-backup-<date>`.

From then on it runs by itself every night at 01:30 UTC. Run it by hand before anything risky (a big change, a
migration you're unsure about).

**Good to know:**
- If a backup fails, GitHub emails you. The log says why (for example, a changed database password: update
  **BACKUP_DATABASE_URL**).
- GitHub pauses scheduled workflows in public repositories after 60 days without any commit. It emails you first;
  re-enable it under **Actions** → **Database backup**.
- Each backup wakes the Neon database for a minute or two: a small part of the free plan's monthly allowance.
- Every push also tests the whole round trip (back up, restore into an empty database, compare) in CI, so you know
  the backups really restore.

### Restoring a backup

A restore goes into a **new, empty database**, never over the live one (the restore refuses a database that already
has tables). You check it, then point the API at it.

1. Neon → your project → **Databases** → **New database**, named for example `restored`. Then **Connect**, choose
   that database, keep pooling off, and copy its connection string.
2. GitHub → **Settings** → **Secrets and variables** → **Actions** → **Secrets** → **New repository secret**:
   **RESTORE_DATABASE_URL** = that connection string.
3. Find the backup: **Actions** → **Database backup** → open the run from the day you want. The number at the end of
   the page address (`.../actions/runs/1234567890`) is its **run ID**.
4. **Actions** → **Restore a backup** → **Run workflow**: paste the run ID, type `RESTORE` to confirm, and run. The
   log ends with how many users and posts were restored.
5. Switch over: Render → **prologue-api** → **Environment** → **DATABASE_URL** = the restored database's connection
   string → **Save**. Check the site. To go back, put the old string back.

For a mistake in the last few hours, Neon's own **Restore** (on the branch page) can be quicker: it rolls the whole
database back to a moment you pick, within the free plan's short history.

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
