"""Demo data for development. Enabled with SEED_DEMO_DATA=true; only runs on an empty database."""
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password
from app.core.time import utcnow
from app.models import (
    ChallengeSuggestion, Follow, Notification, Post, PostComment, ProfessionProfile, QAQuestion, Story, TaskDetails, TaskReview, User,
    UserInterest, UserSurvey, WorkChallenge,
)

U = "https://images.unsplash.com/"

DEMO_USERS = [
    dict(
        username="sarah_plumber", email="sarah@tradespro.com", full_name="Sarah Jenkins",
        bio="Master Plumber | 10+ yrs in commercial pipe systems & troubleshooting",
        avatar=U + "photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        gender="female", age=36,
        prof=dict(industry="Trades & Craftsmanship", title="Master Plumber", slug="plumber",
                  specialization="Commercial & Residential Diagnostics", years=10, company="Jenkins Plumbing LLC",
                  tools=["Pipe Wrench", "Drain Snake", "Infrared Thermal Camera", "PEX Crimper"]),
        interests=["Trades & Craftsmanship", "Technology & Engineering"],
    ),
    dict(
        username="alex_driver", email="alex@citytransit.org", full_name="Alex Rivera",
        bio="City Transit Bus Driver | Navigating 40ft electric buses through dense rush hours",
        avatar=U + "photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        gender="male", age=41,
        prof=dict(industry="Transportation & Logistics", title="Transit Bus Operator", slug="bus-driver",
                  specialization="Articulated & Electric Fleet", years=6, company="Metro Express Transit",
                  tools=["Fleet Telematics", "Route Dispatch System", "Defensive Driving Radar"]),
        interests=["Transportation & Logistics", "Public Service & Safety"],
    ),
    dict(
        username="elena_lawyer", email="elena@vancelegal.com", full_name="Elena Vance, Esq.",
        bio="Commercial Litigation Partner | Tech Contracts, IP Disputes, and Courtroom Strategy",
        avatar=U + "photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        gender="female", age=44,
        prof=dict(industry="Legal & Finance", title="Commercial Litigation Attorney", slug="lawyer",
                  specialization="IP & Breach of Contract Disputes", years=12, company="Vance & Associates Law",
                  tools=["Westlaw", "LexisNexis", "Clio Litigation Suite", "Adobe Pro Redaction"]),
        interests=["Legal & Finance", "Technology & Engineering"],
    ),
]

EXPLORERS = [
    dict(username="law_student_sam", full_name="Sam Okafor", gender="male", age=24,
         avatar=U + "photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
         status="student", interests=["Legal & Finance"]),
    dict(username="homeowner_dave", full_name="Dave Miller", gender="male", age=52,
         avatar=U + "photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
         status="other", interests=["Trades & Craftsmanship"]),
]

POSTS = [
    dict(
        author="elena_lawyer", type="pro_case_study", likes=1450,
        title="Mastering the Subpoena Duces Tecum: How to Compel Critical Evidence Step-by-Step",
        caption="A breakdown of how litigation attorneys draft, scope, and serve third-party discovery subpoenas without getting them quashed.",
        media=[dict(url=U + "photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80", media_type="image",
                    caption="Redacted discovery schedule and document request riders")],
        tags=["law", "litigation", "legalpractice", "subpoena", "evidence"],
        task=dict(
            problem_statement="In a corporate breach of contract dispute, the opposing party claimed all server logs were deleted. We needed to compel the third-party cloud hosting provider to preserve and produce the unedited audit logs before statutory deadlines.",
            category="Legal", difficulty="expert", estimated_time_mins=180,
            tools_used=["Westlaw / LexisNexis", "Federal Rules of Civil Procedure (Rule 45)", "PDF Redaction Suite", "Licensed Process Server"],
            safety_warnings="Ensure proper notice to all parties prior to service to prevent sanctions under FRCP 45(a)(4).",
            steps=[
                dict(step_number=1, title="Draft Narrowly Tailored Document Requests (Schedule A)",
                     description="Avoid overly broad catch-alls that invite undue burden motions. Specify exact server log date ranges, IP tables, and user authentication records.",
                     image_url=U + "photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
                     tip="Define technical terms clearly so IT custodians cannot exploit ambiguities."),
                dict(step_number=2, title="Issue Mandatory Notice of Intent to Serve",
                     description="Serve a copy of the subpoena on all parties to the action at least 5 business days before service on the third-party witness.",
                     image_url=U + "photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
                     tip="Retain timestamped electronic service receipts in the litigation docket."),
                dict(step_number=3, title="Execute Personal Service & Monitor Compliance",
                     description="Engage a certified process server in the target jurisdiction. Track the 14-day statutory objection window.",
                     image_url=U + "photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80",
                     tip="Follow up with a courteous call to the cloud provider's in-house legal counsel to clarify file delivery formats."),
            ]),
    ),
    dict(
        author="sarah_plumber", type="task_walkthrough", likes=894,
        title="Fixing a high-pressure brass valve leak in a multi-story commercial building",
        caption="Walkthrough of diagnosing water hammer and swapping out a compromised 2-inch pressure reducing valve.",
        media=[dict(url=U + "photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80", media_type="image",
                    caption="Initial gauge reading: pressure spiking to 110 PSI")],
        tags=["plumbing", "commercialtrades", "valverepair", "waterhammer"],
        task=dict(
            problem_statement="Commercial building main riser experiencing severe hydraulic shock (water hammer) caused by a failing pressure regulating valve.",
            category="Plumbing", difficulty="advanced", estimated_time_mins=90,
            tools_used=["24-inch Pipe Wrench", "Digital Pressure Manometer", "PTFE Thread Sealant", "Flange Spreader"],
            safety_warnings="Depressurize the riser and tag out before breaking flanges.",
            steps=[
                dict(step_number=1, title="Isolate the Riser Section",
                     description="Close upstream and downstream isolation ball valves and lock out the supply pump.",
                     image_url=U + "photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
                     tip="Always bleed residual pressure through test cock before loosening bolts."),
                dict(step_number=2, title="Extract Damaged Diaphragm & Seat",
                     description="Unbolt the valve bonnet and inspect for cavitation pitting on the brass valve seat.",
                     image_url=U + "photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
                     tip="Clean gasket mating surfaces with a brass wire brush."),
                dict(step_number=3, title="Install New PRV Cartridge & Calibrate",
                     description="Torque bolts in a crisscross pattern and calibrate the set screw to 55 PSI dynamic pressure.",
                     image_url=U + "photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
                     tip="Slowly open upstream valve to prevent sudden surge."),
            ]),
    ),
    dict(
        author="alex_driver", type="task_walkthrough", likes=612,
        title="Downtown rush-hour route navigation: Maneuvering a 60ft articulated hybrid",
        caption="How we manage tight right turns, blind spot clearance, and passenger stop pacing during peak rain hours.",
        media=[dict(url=U + "photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80", media_type="image",
                    caption="Mirror scan checklist before entering roundabout")],
        tags=["transit", "busdriver", "citylogistics", "roadsafety"],
        task=dict(
            problem_statement="Managing tail-swing and cyclist blindspots when making tight 90-degree intersection turns in historic city corridors.",
            category="Transportation", difficulty="intermediate", estimated_time_mins=45,
            tools_used=["Curb Convex Mirrors", "Telematics Route Tablet", "Pneumatic Kneeling Suspension"],
            safety_warnings="Never initiate turn until pedestrian countdown is zero.",
            steps=[
                dict(step_number=1, title="Establish Approach Lane & Pivot Point",
                     description="Position front wheels 4 feet from curb and maintain lane ownership to prevent lane intrusions.",
                     image_url=U + "photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80",
                     tip="Keep eye on right rear pivot axle."),
                dict(step_number=2, title="Complete Sweeping Arc & Smooth Acceleration",
                     description="Counter-steer smoothly once the articulation joint clears the curb edge.",
                     image_url=U + "photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
                     tip="Feather regenerative braking for passenger comfort."),
            ]),
    ),
]

STORIES = [
    ("sarah_plumber", "photo-1581244277943-fe4a9c777189", "Diagnostic camera run through a 40-year old cast iron main line", "Plumbing", 3, 342),
    ("alex_driver", "photo-1570125909232-eb263c188f7e", "Pre-trip morning safety inspection & regenerative brake check completed", "Transportation", 5, 512),
    ("elena_lawyer", "photo-1501339847302-ac426a4a7cbb", "Early morning cortado & binder prep before today's 9:00 AM federal injunction hearing", "Legal", 1, 680),
]


async def seed_demo_data(db: AsyncSession) -> bool:
    """Populate an empty database. Returns True if data was inserted."""
    if (await db.execute(select(func.count()).select_from(User))).scalar_one() > 0:
        return False

    pw = hash_password(settings.DEMO_PASSWORD)
    users = {}

    for d in DEMO_USERS:
        p = d["prof"]
        u = User(
            username=d["username"], email=d["email"], hashed_password=pw, full_name=d["full_name"], bio=d["bio"],
            avatar_url=d["avatar"],
        )
        u.profession = ProfessionProfile(
            industry=p["industry"], title=p["title"], catalog_slug=p.get("slug"), specialization=p["specialization"],
            years_of_experience=p["years"], is_verified_pro=True, company_or_freelance=p["company"],
            key_tools=p["tools"],
        )
        u.survey = UserSurvey(works=True, gender=d["gender"], age=d["age"], data_consent=True)
        u.interests = [UserInterest(interest=i) for i in d["interests"]]
        users[d["username"]] = u

    for d in EXPLORERS:
        u = User(username=d["username"], hashed_password=pw, full_name=d["full_name"], avatar_url=d["avatar"])
        u.survey = UserSurvey(works=False, non_working_status=d["status"], gender=d["gender"], age=d["age"],
                              data_consent=True)
        u.interests = [UserInterest(interest=i) for i in d["interests"]]
        users[d["username"]] = u

    db.add_all(users.values())
    await db.flush()

    now = utcnow()
    seeded_posts = {}
    for i, d in enumerate(POSTS):
        post = Post(
            author_id=users[d["author"]].id, title=d["title"], caption=d["caption"], post_type=d["type"],
            media=d["media"], tags=d["tags"], likes_count=d["likes"], comments_count=0,
            created_at=now - timedelta(hours=i),
        )
        post.task_details = TaskDetails(**d["task"])
        db.add(post)
        seeded_posts[d["author"]] = post
        if d["author"] == "elena_lawyer":
            await db.flush()
            db.add(TaskReview(
                post_id=post.id, user_id=users["law_student_sam"].id, clarity_score=5, accuracy_score=5,
                reviewer_profession="Law Student (2L)",
                feedback_text="This FRCP Rule 45 breakdown explained 3rd-party log preservation better than my Civil Procedure textbook! The notice timing tip was gold.",
            ))
            post.reviews_count, post.rating = 1, 5.0

    for username, photo, caption, tag, hours_ago, views in STORIES:
        db.add(Story(
            user_id=users[username].id, media_url=f"{U}{photo}?auto=format&fit=crop&w=800&q=80", caption=caption,
            profession_tag=tag, created_at=now - timedelta(hours=hours_ago),
            expires_at=now + timedelta(hours=24 - hours_ago), views_count=views,
        ))

    db.add(QAQuestion(
        worker_id=users["elena_lawyer"].id, asker_id=users["law_student_sam"].id,
        question_text="How many hours a week do litigation partners actually spend in the courtroom vs reviewing discovery documents at their desk?",
        topic_tag="Daily Routine & Hours", is_answered=True, upvotes_count=42, answered_at=now,
        answer_text="In commercial litigation, about 85% of our time is actually research, strategy briefs, and depositions. Courtroom appearances happen for critical motions, hearings, and trials ~15% of the time.",
    ))
    db.add(QAQuestion(
        worker_id=users["sarah_plumber"].id, asker_id=users["homeowner_dave"].id,
        question_text="What is the #1 plumbing mistake you see homeowners make when attempting DIY drain repairs?",
        topic_tag="DIY Pitfalls", is_answered=True, upvotes_count=91, answered_at=now,
        answer_text="Over-tightening PVC slip nuts until the rubber washer cracks, and pouring caustic chemical cleaners into old corroded pipes.",
    ))
    # Still waiting for an answer, so each demo professional has something in their Q&A inbox.
    for worker, asker, text, topic in [
        ("sarah_plumber", "law_student_sam",
         "Is it worth getting a master plumber licence, or do most jobs only need a journeyman?", "Career & Salary Advice"),
        ("alex_driver", "homeowner_dave",
         "How do you stay alert on the last loop of a split shift?", "Daily Routine & Worklife"),
        ("elena_lawyer", "homeowner_dave",
         "Which legal research tool would you pick if you could only keep one?", "Tools & Software"),
    ]:
        db.add(QAQuestion(
            worker_id=users[worker].id, asker_id=users[asker].id, question_text=text, topic_tag=topic,
            is_answered=False, upvotes_count=0,
        ))

    chal = WorkChallenge(
        worker_id=users["sarah_plumber"].id,
        title="Unusual water hammer knocking at 3 AM in a 1920s brick brownstone",
        scenario_description="We isolated all radiator loops, tested the expansion tank diaphragm (20 PSI intact), but the homeowner still reports loud knocking at 3 AM specifically. What subtle thermal siphon or solenoid issue would you test next?",
        profession_category="Plumbing", urgency_level="brainstorming", is_solved=True,
        media_url=U + "photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    )
    db.add(chal)
    await db.flush()
    db.add(ChallengeSuggestion(
        challenge_id=chal.id, suggester_id=users["alex_driver"].id, upvotes_count=28, is_accepted_by_worker=True,
        suggestion_text="Check if an automatic ice maker or reverse osmosis filter solenoid valve cycles precisely at 3 AM with no arrestor installed on that branch line.",
        suggested_tool_or_reference="Mini in-line water hammer arrestor (1/4-inch push-fit)",
    ))

    # An open challenge with ideas but no accepted solution yet, so its owner can try accepting one.
    open_chal = WorkChallenge(
        worker_id=users["elena_lawyer"].id,
        title="Opposing counsel keeps missing discovery deadlines: motion to compel now, or one more meet-and-confer?",
        scenario_description=(
            "Third missed production deadline in six weeks. The judge is known to dislike discovery motions, "
            "but trial is four months out. How would you sequence this?"
        ),
        profession_category="Legal", urgency_level="urgent",
    )
    db.add(open_chal)
    await db.flush()
    for suggester, text, ref, votes in [
        ("sarah_plumber",
         "Send one last meet-and-confer letter with a hard date, then file. It shows the judge you tried.", None, 6),
        ("alex_driver",
         "Put every missed date in a one-page timeline exhibit; judges respond to a clear pattern.",
         "Chronology exhibit", 4),
    ]:
        db.add(ChallengeSuggestion(
            challenge_id=open_chal.id, suggester_id=users[suggester].id, suggestion_text=text,
            suggested_tool_or_reference=ref, upvotes_count=votes,
        ))

    # A few real comments; comments_count matches the rows.
    await db.flush()
    for post_author, commenter, body, hours_ago in [
        ("elena_lawyer", "law_student_sam", "Saving this for my Civil Procedure exam. The 5-day notice tip is gold.", 2),
        ("elena_lawyer", "sarah_plumber", "Never knew how much prep goes into one subpoena. Respect.", 1),
        ("sarah_plumber", "homeowner_dave", "I had exactly this leak last winter. Wish I had seen this first!", 3),
        ("sarah_plumber", "alex_driver", "Clear steps. The photo of the valve seat helped a lot.", 1),
        ("alex_driver", "elena_lawyer", "The tail-swing diagram makes me a calmer driver behind buses.", 2),
    ]:
        db.add(PostComment(
            post_id=seeded_posts[post_author].id, user_id=users[commenter].id, body=body,
            created_at=now - timedelta(hours=hours_ago),
        ))
        seeded_posts[post_author].comments_count += 1

    # A small demo social graph so the 'following' feed has something to show.
    for follower, followee in [
        ("law_student_sam", "elena_lawyer"),
        ("homeowner_dave", "sarah_plumber"),
        ("sarah_plumber", "elena_lawyer"),
        ("alex_driver", "sarah_plumber"),
        ("elena_lawyer", "sarah_plumber"),
    ]:
        db.add(Follow(follower_id=users[follower].id, followee_id=users[followee].id))

    await db.flush()
    await _seed_notifications(db)
    await db.commit()
    return True


async def _seed_notifications(db: AsyncSession) -> None:
    """Notifications for the sample activity, as if it had just happened (all unread)."""
    from app.services.notifications import notify

    for f in (await db.execute(select(Follow))).scalars():
        await notify(db, user_id=f.followee_id, actor_id=f.follower_id, type="follow")
    for c in (await db.execute(select(PostComment))).scalars():
        post = (await db.execute(select(Post).where(Post.id == c.post_id))).scalar_one()
        await notify(db, user_id=post.author_id, actor_id=c.user_id, type="comment", post_id=post.id,
                     comment_id=c.id, snippet=c.body)
    for r in (await db.execute(select(TaskReview))).scalars():
        post = (await db.execute(select(Post).where(Post.id == r.post_id))).scalar_one()
        await notify(db, user_id=post.author_id, actor_id=r.user_id, type="review", post_id=post.id,
                     snippet=r.feedback_text)
    for q in (await db.execute(select(QAQuestion))).scalars():
        await notify(db, user_id=q.worker_id, actor_id=q.asker_id, type="question", question_id=q.id,
                     snippet=q.question_text)
    for s in (await db.execute(select(ChallengeSuggestion))).scalars():
        chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == s.challenge_id))).scalar_one()
        await notify(db, user_id=chal.worker_id, actor_id=s.suggester_id, type="suggestion", challenge_id=chal.id,
                     suggestion_id=s.id, snippet=s.suggestion_text)
        if s.is_accepted_by_worker:
            await notify(db, user_id=s.suggester_id, actor_id=chal.worker_id, type="accepted",
                         challenge_id=chal.id, suggestion_id=s.id, snippet=s.suggestion_text)
