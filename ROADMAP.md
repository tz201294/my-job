# Prologue Roadmap

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
- Tags field in the post form (validated the same way on the server).
- Rebrand to Prologue ("A story behind every profession"), new icon and wordmark.
- The demo stays online at /my-job/demo/ next to the real app (separate logins, links both ways).
- Backend tests and migrations run on Postgres 17 in CI; Render deploys only after CI passes.
- Error reporting (Sentry, API + website, no personal data, off until a DSN is set), `/health/db`, and an
  uptime-alert guide (UptimeRobot). Setup: docs/DEPLOY.md step 4.
- Spam limits on sign-ups (per IP) and on posting, commenting, asking, reacting, following and editing (per
  account); only successful actions count. A test makes sure every new write endpoint picks a limit.
- "Forgot password" and email confirmation (Brevo API; one-time signed links; reset only to confirmed
  addresses). Setup: docs/DEPLOY.md step 5.
- Reports, blocking and moderation: report any post, comment, question, challenge, idea or account; block from a
  profile (hidden both ways, no contact); a Moderation page for ADMIN_USERNAMES to remove content and suspend or
  reinstate accounts. Setup: docs/DEPLOY.md step 7.
- Private accounts: public by default; a private account's posts and stories are for approved followers only
  (follow requests, accepted or declined in Notifications).
- Interests are catalog professions (picked at sign-up and in Settings), and a personal "For you" feed and AMA order
  learned from interests, actions and what people open, with about one post in five for discovery.
- Privacy Policy and Terms of Service pages, accepted at sign-up (version recorded), Download my data (JSON), and
  the font served from the site instead of Google Fonts. Before launch: set VITE_CONTACT_EMAIL and have the text
  checked by someone who knows the law (docs/DEPLOY.md step 6).
- Profession catalog: 51 professions in 5 languages, profession pages with the people who do them and their posts,
  a profession picker at sign-up and in Settings (links the profile and sets the field).
- Languages, round 1: English, Spanish, French, German, Japanese (device language by default; Settings; saved on
  the account; server messages and emails too). Translations should be checked by native speakers before launch.
- Photo uploads for post covers, step photos, stories and profile photos (checked, turned upright, resized,
  stripped of GPS and other hidden data, stored on Cloudinary). Setup: docs/DEPLOY.md step 8. Photos are deleted
  from storage once nothing uses them (post, story or account removed, or a photo replaced).
- Frontend production readiness: page addresses (deep links, back button, 404, tab titles, GitHub Pages
  fallback), crash screen, permanent lint + UI tests in CI, demo code split out of the real build, lazy images,
  Content Security Policy, manifest/icons/link previews.

## Next

### 1. Deploy the real backend — ready, waiting for the account sign-ups
Decision made: start free (Render free web service + Neon free Postgres + GitHub Pages), move to paid later
without code changes. Everything is in the repo (`render.yaml`, deploy workflow reads `VITE_API_URL`); follow
[docs/DEPLOY.md](docs/DEPLOY.md). Rehearsed locally in production mode (sign-up, posts, comments, reactions,
settings, deep links). CI runs every backend test and the migrations on Postgres 17 (Neon's default), checks
the migrations match the models and can be undone, and Render only deploys once CI passes.

### 1b. Languages, round 2
Hebrew and Arabic (right-to-left: mirror the layout, mostly swapping left/right classes for start/end ones; the
`dir` attribute is already set), plus Russian. The demo's sample posts and categories are English content and stay so.
The Privacy Policy and Terms are English only for now (a notice says so in other languages).

### 2. More on uploads
Photo uploads are done (Cloudinary), including deleting photos nothing uses any more. Still open: video uploads,
the photo of a story that simply expired, and an image on Live Work challenges.

### 3. Frontend: what's left before real users
The frontend itself is ready; these depend on the backend steps above or are polish:
- Point the build at the deployed API (`VITE_API_URL`) once step 1 is done (the demo stays at /demo/).
- Video upload UI (step 2).
- Basic analytics, if wanted.
- An accessibility pass with a screen reader, and loading skeletons.

## Ideas for later
- Search across posts, case studies, tools and people (Postgres full-text search).
- Replies to comments; editing/deleting reviews.
- A small permanent frontend test suite (Vitest + Testing Library) running in CI.
- Loading skeletons, friendlier empty states, dark mode.
- Real-time notifications (WebSocket or server-sent events) instead of polling every minute; email/push.
