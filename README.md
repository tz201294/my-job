# MyJob 💼📱

> An Instagram-like social media platform where professionals across all industries upload stories, daily workflows, and task solutions.

## Overview
**MyJob** is designed for professionals and workers of all fields—plumbers, bus drivers, lawyers, accountants, software engineers, doctors, and more—to showcase:
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

### Configuration and production
`ENVIRONMENT` defaults to `production`, and in production the API **refuses to start** unless:
- `SECRET_KEY` is a random value of at least 32 characters
  (`python -c "import secrets; print(secrets.token_urlsafe(48))"`);
- `SEED_DEMO_DATA` is false;
- `BACKEND_CORS_ORIGINS` lists real frontend origins (a JSON list, e.g. `["https://myjob.example.com"]`), not `"*"`.

Use `ENVIRONMENT=development` locally (the compose file and `.env.example` already do).

Login is rate limited: after 5 failed attempts for one username, or 20 from one IP address, within 15 minutes
the API answers `429` with a `Retry-After` header (`LOGIN_*` settings). Counts are kept in memory per API
process, so use a shared store such as Redis before running several workers. Behind a reverse proxy, set
uvicorn's `FORWARDED_ALLOW_IPS` to the proxy address so client IPs are read correctly.

Media links (post media, step images, stories, challenges) must be `http://` or `https://` URLs.

### Frontend
```bash
cd frontend && npm install && npm run dev
```

### Demo mode (no backend)
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

