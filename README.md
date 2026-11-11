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
Demo accounts (`sarah_plumber`, `alex_driver`, `elena_lawyer`; password `demo1234`) are seeded into an
**empty** database when `SEED_DEMO_DATA=true` (the compose default). Disable it and set a real
`SECRET_KEY` outside development.

### Backend (local, no Docker)
```bash
cd backend
pip install -r requirements.txt
set DATABASE_URL=sqlite+aiosqlite:///./myjob.db     # or a postgresql+asyncpg:// URL
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
python -m pytest                                    # tests
```

### Frontend
```bash
cd frontend && npm install && npm run dev
```

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

Still sample/local only: **Reels** (labelled in the UI), story highlights and post comments. Media is
link-only for now (no file uploads).

Social endpoints: `POST`/`DELETE /auth/users/{username}/follow` (idempotent; you can't follow yourself),
`GET /posts/feed?following=true`, `POST /posts/{id}/bookmark` (toggle), `GET /posts/bookmarks`.
Existing databases need `python -m alembic upgrade head` (`0002` adds upvotes, `0003` adds follows and
bookmarks and drops the old placeholder `followers_count`/`following_count` columns, so counts are now
computed from real follow rows; the demo seed creates a small follow graph).

