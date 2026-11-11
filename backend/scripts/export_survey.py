"""Export sign-up survey data for analysis.

Usage (from the backend/ directory):
    python -m scripts.export_survey                    # writes survey_export.csv
    python -m scripts.export_survey --out data.csv --consented-only

One row per user. Interests are joined with ';'. Passwords, e-mail addresses and
names are never exported; the user id is replaced by a one-way hash.
"""
import argparse
import asyncio
import csv
import hashlib

from sqlalchemy import select

from app.db.session import AsyncSessionLocal, engine
from app.models import ProfessionProfile, User, UserInterest, UserSurvey

COLUMNS = [
    "user_hash", "signed_up_at", "works", "non_working_status", "industry", "job_title", "specialization",
    "years_of_experience", "gender", "age", "country", "education_level", "interests", "data_consent",
]


async def export(path: str, consented_only: bool) -> int:
    async with AsyncSessionLocal() as db:
        stmt = (
            select(User, UserSurvey, ProfessionProfile)
            .join(UserSurvey, UserSurvey.user_id == User.id)
            .outerjoin(ProfessionProfile, ProfessionProfile.user_id == User.id)
            .order_by(User.created_at)
        )
        if consented_only:
            stmt = stmt.where(UserSurvey.data_consent.is_(True))
        rows = (await db.execute(stmt)).all()

        interests: dict = {}
        for uid, interest in (await db.execute(select(UserInterest.user_id, UserInterest.interest))).all():
            interests.setdefault(uid, []).append(interest)

    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for user, s, p in rows:
            w.writerow({
                "user_hash": hashlib.sha256(user.id.encode()).hexdigest()[:16],
                "signed_up_at": user.created_at.isoformat(),
                "works": s.works,
                "non_working_status": s.non_working_status or "",
                "industry": p.industry if p else "",
                "job_title": p.title if p else "",
                "specialization": (p.specialization or "") if p else "",
                "years_of_experience": p.years_of_experience if p else "",
                "gender": s.gender,
                "age": s.age,
                "country": s.country or "",
                "education_level": s.education_level or "",
                "interests": ";".join(sorted(interests.get(user.id, []))),
                "data_consent": s.data_consent,
            })
    await engine.dispose()
    return len(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default="survey_export.csv")
    ap.add_argument("--consented-only", action="store_true", help="only users who ticked the analytics consent box")
    args = ap.parse_args()
    print(f"Exported {asyncio.run(export(args.out, args.consented_only))} rows to {args.out}")
