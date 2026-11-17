# MyJob Roadmap

What is done, what is next, and decisions still open. Update this file when a step is finished.

## Done
- Demo mode on GitHub Pages (https://tz201294.github.io/my-job/), runs fully in the browser.
- Backend hardening: production config checks, CORS, login rate limit, http(s)-only media links, Docker cleanup, CI.
- Q&A answers ("Waiting for my answer" inbox).
- Accepting a suggestion as the solution on a live work challenge.
- Editing and deleting your own posts, stories, questions, challenges and ideas.
- Comments on posts.
- App layout: side menu (sidebar on wide screens, drawer on phones), phone bottom tab bar, My activity,
  Settings and Notifications (placeholder) pages, phone search, no fake unread dot.
- Settings: edit profile (name, bio, photo link, email, work, interests), data-sharing consent, password
  change (signs out other sessions), delete account (removes everything and fixes everyone's counts).
- Notifications (bell badge, list, open the related post/question/challenge/profile) and emoji reactions
  on comments (❤️ 👍 😂 😮 👏 💡).
- Teal + cyan color theme.

## Next

### 1. Deploy the real backend (waiting on a decision)
Today only the demo is online; the real API and database run only locally, so nobody else can sign up and
keep their data. This step puts the API and a Postgres database on a hosting service and points the
frontend at it.

**Decisions needed before starting:**
- **Host:** Render (simplest, free tier sleeps when idle, so the first request is slow), Railway (simple,
  always on, about $5/month) or Fly.io (more control, a bit more setup). All three can provide Postgres.
- **Budget:** free with sleeping, or a few dollars a month for an always-on backend.

**What the step involves:**
- Create the account on the chosen host and sign in (only the owner can do this).
- Add the host's config file to the repo and set the environment variables: `ENVIRONMENT=production`,
  a random `SECRET_KEY` (32+ characters), `DATABASE_URL` from the host's Postgres, `SEED_DEMO_DATA=false`,
  `BACKEND_CORS_ORIGINS` set to the frontend address.
- Run `alembic upgrade head` on deploy (the Dockerfile already does this).
- Build the frontend with `VITE_API_URL` pointing at the deployed API. Decide whether GitHub Pages keeps
  showing the demo or switches to the real app.
- Move the login rate limit to Redis if more than one API worker is used.

### 2. Real file uploads
Upload photos and videos instead of pasting links: storage (local disk first, then an S3-compatible bucket
for hosting), size and type limits, image resizing, upload UI in every create form, and a stand-in for the
demo site. **Decision needed:** where files are stored once hosted.

### 3. Frontend follow-ups (agreed order)
1. **Page addresses (routing):** URLs for profiles, posts and pages so the back button and shared links work.

## Ideas for later
- Search across posts, case studies, tools and people (Postgres full-text search).
- Replies to comments; editing/deleting reviews.
- A small permanent frontend test suite (Vitest + Testing Library) running in CI.
- Loading skeletons, friendlier empty states, dark mode.
- Real-time notifications (WebSocket or server-sent events) instead of polling every minute; email/push.
