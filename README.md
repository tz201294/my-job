# Prologue

> **A story behind every profession.**

> An Instagram-like social media platform where professionals across all industries upload stories, daily workflows, and task solutions.

## Overview
**Prologue** is designed for professionals and workers of all fields—plumbers, bus drivers, lawyers, accountants, software engineers, doctors, and more—to showcase:
- **Day-in-the-Life Stories & Highlights**: Ephemeral and pinned updates detailing real-world shifts and projects.
- **Job Task Solutions**: Structured breakdowns of specific problems solved, complete with tool lists and step-by-step workflows.
- **Profession Discovery Hub**: Explore accounts and feeds filtered by profession, industry, tools, and experience level.

## Getting Started
See [`SKILL.md`](SKILL.md) for domain architecture, data models, and feature guidelines.

## Running the app

### Backend (PostgreSQL via Docker)
```bash
docker compose up --build        # runs `alembic upgrade head`, then the API on :8000
```
To load the demo accounts (`sarah_plumber`, `alex_driver`, `elena_lawyer`; password `demo1234`) into an
**empty** database, put `SEED_DEMO_DATA=true` in a `.env` file next to `docker-compose.yml`. Postgres and
Redis are not published to the host; only the API port 8000 is.

### Backend (local, no Docker)
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env                              # ENVIRONMENT=development, SQLite, demo data
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
python -m pytest                                    # tests (also run by CI on every push)
```
Tests use a fresh in-memory SQLite database by default. To run them on Postgres, as production does, point
`TEST_DATABASE_URL` at an **empty, throwaway** database (its tables are dropped and recreated for every test):
`TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/prologue_test python -m pytest`.

### Configuration and production
`ENVIRONMENT` defaults to `production`, and in production the API **refuses to start** unless:
- `SECRET_KEY` is a random value of at least 32 characters
  (`python -c "import secrets; print(secrets.token_urlsafe(48))"`);
- `SEED_DEMO_DATA` is false;
- `BACKEND_CORS_ORIGINS` lists real frontend origins (a JSON list, e.g. `["https://prologue.example.com"]`), not `"*"`.

Use `ENVIRONMENT=development` locally (the compose file and `.env.example` already do).

Login is rate limited: after 5 failed attempts for one username, or 20 from one IP address, within 15 minutes
the API answers `429` with a `Retry-After` header (`LOGIN_*` settings). Counts are kept in memory per API
process, so use a shared store such as Redis before running several workers. Behind a reverse proxy, set
uvicorn's `FORWARDED_ALLOW_IPS` to the proxy address so client IPs are read correctly.

Spam limits: each account may only post, comment, ask, react, follow and edit so often (e.g. 10 comments a minute,
10 posts an hour), and one IP address may create 5 accounts an hour. Only successful actions count. Over a limit the
API answers `429` with a `Retry-After` header and a message the app shows as is. The numbers are in
`app/api/rate_limits.py`; `RATE_LIMITS_ENABLED=false` switches them off. Like the login limit, counts live in the
API process's memory.

Media links (post media, step images, stories, challenges) must be `http://` or `https://` URLs.

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000, proxies /api to the backend on :8000
npm test           # unit + rendered UI tests (Vitest + Testing Library, in demo mode)
npm run lint       # ESLint (React + hooks rules)
npm run build      # production build in dist/
```
CI runs lint, tests and the build on every push; the backend tests and migrations run on both SQLite and
Postgres 17. The GitHub Pages deploy also runs the frontend tests first, and Render deploys the API only once CI
passes.

**Page addresses.** `/` home (`/following`, `/saved`), `/live-work` (`/live-work/<challenge id>`), `/qa`
(`/qa/inbox`), `/reels`, `/activity`, `/notifications`, `/settings`, `/u/<username>` profiles and `/p/<post id>`
single posts with their comments; anything else shows "Page not found". Links work when opened directly, and
after logging in you land on the page the link pointed to.

**Putting it online (free):** see [docs/DEPLOY.md](docs/DEPLOY.md) — Render (API, `render.yaml`) + Neon
(Postgres) + GitHub Pages (website, using the `VITE_API_URL` repository variable). `DATABASE_URL` may be given in
the form hosts hand out (`postgresql://...?sslmode=require`); the app converts it for asyncpg.
Email (confirmation and password-reset links) goes through Brevo's API when `BREVO_API_KEY` and `EMAIL_FROM` are
set; without them, emails are written to the API's log instead, so locally you can copy the link from there.
Links point to `FRONTEND_URL`. Setup: docs/DEPLOY.md step 5.
Profession catalog: 51 professions (description, daily tasks, tools, how to get in, related professions) in every
app language, at `/professions` and `/professions/<slug>`. The list is `frontend/src/catalog/professions.json`
(the server keeps a copy in `backend/app/core/professions.json`; a test checks they match) and the words are in
`frontend/src/catalog/text/<lang>.js`. People can link their profession to it at sign-up and in Settings.
Languages: English, Spanish, French, German and Japanese for everything the app itself says (buttons, menus,
messages, emails); posts and names stay as written. The app starts in the device's language (else a guess from
its time zone, else English), and the choice in Settings or on the login screen is saved on the account.
Frontend text lives in `frontend/src/i18n/` (`en.js` is the source; use `t('key')` from `useI18n()`); server
messages and emails are translated in `backend/app/core/i18n.py` from the `Accept-Language` header the app sends.
Tests fail if a language misses a key or a placeholder, or if a server error message has no translation.
Privacy and terms: `/privacy` and `/terms` (text in `frontend/src/components/LegalPages.jsx`, contact address from
`VITE_CONTACT_EMAIL`); sign-up requires accepting them and records the version (`backend/app/core/legal.py`).
Settings → Download my data exports everything stored about the account as JSON. The font is served from the site
itself, not Google Fonts.
Photo uploads: `POST /api/v1/uploads/images` (form fields `file`, `purpose`). Photos are validated, turned upright,
resized and re-encoded as WebP without metadata (no GPS), then stored on Cloudinary (`CLOUDINARY_URL`) or, in
development, in `MEDIA_DIR` served at `/media/`. In production without Cloudinary, uploads are refused and the app
shows only the link box. The demo shrinks photos in the browser instead.
Moderation: anyone can report content or accounts and block accounts; the usernames in `ADMIN_USERNAMES` get a
Moderation page (remove content, suspend or reinstate accounts). Suspended accounts can't log in and their content is
hidden; blocking hides content both ways and stops follows, comments, questions and notifications between the two.
Private accounts (Settings > Privacy & data, off by default): posts and stories are shown only to followers the owner
approves in Notifications; the profile card, AMAs and Live Work stay public. Going public lets waiting requests in.
Error reporting (Sentry) is off unless `SENTRY_DSN` (API) / `VITE_SENTRY_DSN` (website) is set; `/health` is a
database-free liveness check, `/health/db` also checks the database.

**Deploying the frontend.** Build with `VITE_API_URL=https://your-api.example.com/api/v1` (or serve it behind a
proxy that forwards `/api`), and set `VITE_BASE` if it isn't served from the site root (GitHub Pages uses
`VITE_BASE=/my-job/`). The host must send unknown paths to `index.html` (single-page app fallback); on GitHub
Pages the deploy copies `index.html` to `404.html` for that. Production builds include a Content Security Policy
(see `vite.config.js`) that allows https images/video from any site (posts link to external media) and API calls
to `VITE_API_URL`'s origin.

### Demo mode (no backend)
The GitHub Pages deploy always publishes the demo at `/my-job/demo/` (https://tz201294.github.io/my-job/demo/),
next to the main app at `/my-job/`. The two keep separate logins in the browser.
On GitHub Pages, or when built with `VITE_DEMO_MODE=true`, the app runs entirely in the browser
(`frontend/src/api/demoBackend.js`): sample data, with changes saved only in that browser's localStorage.
Log in as a demo account with password `demo1234`, or sign up. Outside demo mode the app always talks to the
real API and shows an error if it can't be reached, so it never falls back to sample data silently.

## Accounts & sign-up survey
Users sign up with a username + password (bcrypt-hashed, JWT sessions). The sign-up form asks whether
they work, their field/profession, **multiple** fields of interest, gender, age, and optional
country/education. Answers are stored in `user_surveys`, `profession_profiles` and `user_interests`.

Export anonymised data for analysis (no names, emails or passwords; ids are hashed):
```bash
cd backend
python -m scripts.export_survey --out survey.csv --consented-only
```

## What is persisted vs. sample data
The frontend loads everything from the API (`/api/v1`) and writes back through it. After a refresh you keep:
posts and case studies, stories (24h), likes, reviews and ratings (one per user, not on your own post),
Q&A questions and upvotes, live-work challenges, suggestions and upvotes, real profiles
(`/auth/users/{username}`, `/posts/feed?author_username=`), **follows** (real follower/following counts, a
"Following" feed) and **saved posts** (private bookmarks, a "Saved" feed).

Still sample/local only: **Reels** (labelled in the UI) and story highlights. Media is
link-only for now (no file uploads).

Notifications: `GET /notifications?limit=&offset=` (newest first, with `unread_count` and `total`),
`GET /notifications/unread-count` (the app polls it every minute for the bell badge) and `POST /notifications/read`
(`{"ids": [...]}`, or no ids for all). Created for follows, questions to you, answers to your questions, ideas on
your challenges, accepted ideas, reviews and comments on your posts, and reactions to your comments; never for your
own actions, and repeats (follow/unfollow/follow, changing a reaction) refresh one unread notification instead of
adding more. Deleting content or an account removes the notifications about it.

Comment reactions: `PUT /posts/{id}/comments/{comment_id}/reaction` (`{"emoji": "❤️"}`; one of ❤️ 👍 😂 😮 👏 💡,
one reaction per person, a new one replaces yours) and `DELETE` on the same URL. Comments include `reactions`
(emoji → count) and `my_reaction`. Migration `0007` adds both tables.

Your account (Settings): `PATCH /auth/me` edits name, bio, photo link, email, interests, work details
(`profession`, or `works: false`) and `data_consent`; changing the field or job title removes the verified badge.
`POST /auth/me/password` (`current_password`, `new_password`) returns a new token and signs out every older session
(migration `0006` adds `users.password_changed_at`). `POST /auth/me/delete` (`password`) deletes the account and
everything it owns, and corrects counts on other people's content (likes, upvotes, comments, ratings, follows).
Wrong passwords on these endpoints count toward the login lockout.

Comments: `GET /posts/{id}/comments?limit=&offset=` (public, oldest first, returns `{total, comments}`),
`POST /posts/{id}/comments` (`{"body": "..."}`, 1–2000 chars), `PATCH /posts/{id}/comments/{comment_id}` (the
commenter only) and `DELETE` on the same URL (the commenter or the post's author). A post's `comments_count` is
recounted from the rows on every change; migration `0005` adds the table and resets the old placeholder counts to 0.

Q&A: `POST /community/qa/questions/{id}/answer` (`answer_text`, optional `video_response_url`) lets the
professional who was asked answer, or edit their answer (403 for anyone else). `GET /community/qa?worker_id=…&answered=false`
lists a worker's unanswered questions; the Q&A tab shows them under "Waiting for my answer".

Editing and deleting your own content (403 for anyone else; deletes return 204 and also remove likes, saves,
reviews, upvotes and suggestions that belong to the item):

| What | Edit (`PATCH`, only fields sent change) | Delete (`DELETE`) | Who |
|---|---|---|---|
| Post | `/posts/{id}`: title, caption, tags, media, task_details (`null` removes it) | `/posts/{id}` | author |
| Story | — | `/stories/{id}` | author |
| Question | `/community/qa/questions/{id}`: text, topic (until answered, else 409) | same URL | asker; delete also the professional asked |
| Challenge | `/community/challenges/{id}`: title, description, field, urgency | same URL | owner |
| Idea | `/community/suggestions/{id}`: text, tool (not once accepted, 409) | same URL | author; delete also the challenge owner (reopens it if it was the accepted one) |

Live work challenges: `POST /community/suggestions/{id}/accept` lets the person who posted the challenge mark a
suggestion as the solution (replacing any earlier one; the challenge becomes solved), and `DELETE` on the same URL
withdraws it. Both return the updated challenge; anyone else gets 403. Migration `0004` enforces one accepted
suggestion per challenge and syncs `is_solved` for existing data.

Social endpoints: `POST`/`DELETE /auth/users/{username}/follow` (idempotent; you can't follow yourself),
`GET /posts/feed?following=true`, `POST /posts/{id}/bookmark` (toggle), `GET /posts/bookmarks`.
Existing databases need `python -m alembic upgrade head` (`0002` adds upvotes, `0003` adds follows and
bookmarks and drops the old placeholder `followers_count`/`following_count` columns, so counts are now
computed from real follow rows; the demo seed creates a small follow graph).

