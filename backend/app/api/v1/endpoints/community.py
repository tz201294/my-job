from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.api.serializers import (
    challenge_out, question_out, review_out, suggestion_out, upvoted_question_ids, upvoted_suggestion_ids,
)
from app.core.time import utcnow
from app.db.session import get_db
from app.models import (
    ChallengeSuggestion, Post, QAQuestion, QAUpvote, SuggestionUpvote, TaskReview, User, WorkChallenge,
)
from app.schemas.community import (
    ChallengeSuggestionCreate, ChallengeSuggestionResponse, ChallengeSuggestionUpdate, QAAnswerCreate,
    QAQuestionCreate, QAQuestionResponse, QAQuestionUpdate, WorkChallengeUpdate,
    QASessionResponse, TaskReviewCreate, TaskReviewResponse, WorkChallengeCreate, WorkChallengeResponse,
)

router = APIRouter()


# Reviews & Ratings
@router.get("/reviews/{post_id}", response_model=List[TaskReviewResponse])
async def get_task_reviews(post_id: str, db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(TaskReview).where(TaskReview.post_id == post_id).order_by(TaskReview.created_at.desc())
        )
    ).scalars().all()
    return [review_out(r) for r in rows]


@router.post("/reviews", response_model=TaskReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_task_review(
    review_in: TaskReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = (await db.execute(select(Post).where(Post.id == review_in.post_id))).scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id == user.id:
        raise HTTPException(status_code=400, detail="You can't review your own post")
    already = (
        await db.execute(
            select(TaskReview.id).where(TaskReview.post_id == post.id, TaskReview.user_id == user.id)
        )
    ).first()
    if already:
        raise HTTPException(status_code=409, detail="You already reviewed this post")

    review = TaskReview(
        post_id=review_in.post_id,
        user_id=user.id,
        clarity_score=review_in.clarity_score,
        accuracy_score=review_in.accuracy_score,
        feedback_text=review_in.feedback_text,
        reviewer_profession=review_in.reviewer_profession,
        # Peer badge only for users whose own profile is a verified professional
        is_peer_verified=bool(user.profession and user.profession.is_verified_pro),
    )
    db.add(review)
    await db.flush()

    avg, count = (
        await db.execute(
            select(
                func.avg((TaskReview.clarity_score + TaskReview.accuracy_score) / 2.0),
                func.count(),
            ).where(TaskReview.post_id == review_in.post_id)
        )
    ).one()
    await db.execute(
        update(Post).where(Post.id == review_in.post_id).values(rating=round(float(avg), 1), reviews_count=count)
    )
    await db.commit()
    review = (await db.execute(select(TaskReview).where(TaskReview.id == review.id))).scalar_one()
    return review_out(review)


# Q&A Segments
@router.get("/qa", response_model=List[QAQuestionResponse])
async def list_questions(
    worker_id: Optional[str] = None,
    answered: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """AMA questions across professionals, newest first.

    `worker_id` limits the list to questions addressed to one worker; `answered=false` lists only
    questions still waiting for an answer (e.g. a worker's inbox).
    """
    stmt = select(QAQuestion).order_by(QAQuestion.created_at.desc()).limit(limit).offset(offset)
    if worker_id:
        stmt = stmt.where(QAQuestion.worker_id == worker_id)
    if answered is not None:
        stmt = stmt.where(QAQuestion.is_answered.is_(True) if answered else QAQuestion.is_answered.isnot(True))
    rows = (await db.execute(stmt)).scalars().all()
    voted = await upvoted_question_ids(db, user, rows)
    return [question_out(q, voted) for q in rows]


@router.get("/qa/{worker_id}", response_model=QASessionResponse)
async def get_worker_qa(
    worker_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    worker = (await db.execute(select(User).where(User.id == worker_id))).scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    questions = (
        await db.execute(
            select(QAQuestion).where(QAQuestion.worker_id == worker_id).order_by(QAQuestion.created_at.desc())
        )
    ).scalars().all()
    voted = await upvoted_question_ids(db, user, questions)
    return {
        "worker_id": worker_id,
        "worker_name": worker.full_name,
        "worker_profession": worker.profession.title if worker.profession else "Professional",
        "total_questions": len(questions),
        "answered_questions": sum(1 for q in questions if q.is_answered),
        "questions": [question_out(q, voted) for q in questions],
    }


@router.post("/qa/{worker_id}/ask", response_model=QAQuestionResponse, status_code=status.HTTP_201_CREATED)
async def ask_worker_question(
    worker_id: str,
    q_in: QAQuestionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    worker = (await db.execute(select(User).where(User.id == worker_id))).scalar_one_or_none()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    q = QAQuestion(
        worker_id=worker_id,
        asker_id=user.id,
        question_text=q_in.question_text,
        topic_tag=q_in.topic_tag or "General Inquiry",
    )
    db.add(q)
    await db.commit()
    q = (await db.execute(select(QAQuestion).where(QAQuestion.id == q.id))).scalar_one()
    return question_out(q)


@router.post("/qa/questions/{question_id}/answer", response_model=QAQuestionResponse)
async def answer_question(
    question_id: str,
    a_in: QAAnswerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The worker a question was addressed to answers it. Sending again edits the answer."""
    q = (await db.execute(select(QAQuestion).where(QAQuestion.id == question_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if q.worker_id != user.id:
        raise HTTPException(status_code=403, detail="Only the professional who was asked can answer this question")

    q.answer_text = a_in.answer_text
    q.video_response_url = a_in.video_response_url
    if not q.is_answered:
        q.is_answered = True
        q.answered_at = utcnow()
    await db.commit()

    q = (await db.execute(select(QAQuestion).where(QAQuestion.id == question_id))).scalar_one()
    voted = await upvoted_question_ids(db, user, [q])
    return question_out(q, voted)


async def _question_or_404(db: AsyncSession, question_id: str) -> QAQuestion:
    q = (await db.execute(select(QAQuestion).where(QAQuestion.id == question_id))).scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q


@router.patch("/qa/questions/{question_id}", response_model=QAQuestionResponse)
async def update_question(
    question_id: str,
    q_in: QAQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The asker rewords their question. Not allowed once it has been answered."""
    q = await _question_or_404(db, question_id)
    if q.asker_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own questions")
    if q.is_answered:
        raise HTTPException(status_code=409, detail="This question has been answered, so it can't be edited")
    changes = q_in.changes()
    if "question_text" in changes:
        q.question_text = changes["question_text"]
    if "topic_tag" in changes:
        q.topic_tag = changes["topic_tag"] or "General Inquiry"
    await db.commit()
    q = (await db.execute(select(QAQuestion).where(QAQuestion.id == question_id))).scalar_one()
    return question_out(q, await upvoted_question_ids(db, user, [q]))


@router.delete("/qa/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The asker, or the professional it was addressed to, removes a question (and its answer)."""
    q = await _question_or_404(db, question_id)
    if user.id not in (q.asker_id, q.worker_id):
        raise HTTPException(status_code=403, detail="Only the asker or the professional asked can delete this question")
    await db.execute(delete(QAUpvote).where(QAUpvote.question_id == question_id))
    await db.delete(q)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/qa/questions/{question_id}/upvote")
async def toggle_question_upvote(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _toggle_upvote(
        db, user, QAQuestion, QAUpvote, "question_id", question_id, "Question not found"
    )


# Problem & Challenge Crowdsourcing
@router.get("/challenges", response_model=List[WorkChallengeResponse])
async def get_work_challenges(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    stmt = select(WorkChallenge).order_by(WorkChallenge.created_at.desc())
    if category:
        stmt = stmt.where(func.lower(WorkChallenge.profession_category) == category.lower())
    challenges = (await db.execute(stmt)).scalars().all()
    voted = await upvoted_suggestion_ids(db, user, challenges)
    return [challenge_out(c, voted) for c in challenges]


@router.post("/challenges", response_model=WorkChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    chal_in: WorkChallengeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chal = WorkChallenge(
        worker_id=user.id,
        title=chal_in.title,
        scenario_description=chal_in.scenario_description,
        profession_category=chal_in.profession_category,
        media_url=chal_in.media_url,
        urgency_level=chal_in.urgency_level,
    )
    db.add(chal)
    await db.commit()
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == chal.id))).scalar_one()
    return challenge_out(chal)


async def _own_challenge(db: AsyncSession, user: User, challenge_id: str) -> WorkChallenge:
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == challenge_id))).scalar_one_or_none()
    if not chal:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if chal.worker_id != user.id:
        raise HTTPException(status_code=403, detail="You can only change your own challenges")
    return chal


@router.patch("/challenges/{challenge_id}", response_model=WorkChallengeResponse)
async def update_challenge(
    challenge_id: str,
    chal_in: WorkChallengeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chal = await _own_challenge(db, user, challenge_id)
    for field, value in chal_in.changes().items():
        setattr(chal, field, value)
    await db.commit()
    return await _challenge_response(db, user, challenge_id)


@router.delete("/challenges/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge(
    challenge_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The owner deletes their challenge, with all suggestions and their upvotes."""
    chal = await _own_challenge(db, user, challenge_id)
    suggestion_ids = select(ChallengeSuggestion.id).where(ChallengeSuggestion.challenge_id == challenge_id)
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id.in_(suggestion_ids)))
    await db.delete(chal)  # suggestions go with it (delete-orphan)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/challenges/{challenge_id}/suggest",
    response_model=ChallengeSuggestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_challenge_suggestion(
    challenge_id: str,
    sug_in: ChallengeSuggestionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == challenge_id))).scalar_one_or_none()
    if not chal:
        raise HTTPException(status_code=404, detail="Challenge not found")
    sug = ChallengeSuggestion(
        challenge_id=challenge_id,
        suggester_id=user.id,
        suggestion_text=sug_in.suggestion_text,
        suggested_tool_or_reference=sug_in.suggested_tool_or_reference,
    )
    db.add(sug)
    await db.commit()
    sug = (await db.execute(select(ChallengeSuggestion).where(ChallengeSuggestion.id == sug.id))).scalar_one()
    return suggestion_out(sug)


async def _suggestion_or_404(db: AsyncSession, suggestion_id: str) -> ChallengeSuggestion:
    sug = (
        await db.execute(select(ChallengeSuggestion).where(ChallengeSuggestion.id == suggestion_id))
    ).scalar_one_or_none()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return sug


@router.patch("/suggestions/{suggestion_id}", response_model=ChallengeSuggestionResponse)
async def update_suggestion(
    suggestion_id: str,
    sug_in: ChallengeSuggestionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author rewords their idea. Not allowed once it was accepted as the solution."""
    sug = await _suggestion_or_404(db, suggestion_id)
    if sug.suggester_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own ideas")
    if sug.is_accepted_by_worker:
        raise HTTPException(status_code=409, detail="This idea was accepted as the solution, so it can't be edited")
    for field, value in sug_in.changes().items():
        setattr(sug, field, value)
    await db.commit()
    sug = await _suggestion_or_404(db, suggestion_id)
    voted = await db.execute(
        select(SuggestionUpvote.suggestion_id).where(
            SuggestionUpvote.user_id == user.id, SuggestionUpvote.suggestion_id == suggestion_id
        )
    )
    return suggestion_out(sug, set(voted.scalars().all()))


@router.delete("/suggestions/{suggestion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The author, or the challenge owner, removes an idea. Removing the accepted one reopens the challenge."""
    sug = await _suggestion_or_404(db, suggestion_id)
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == sug.challenge_id))).scalar_one()
    if user.id not in (sug.suggester_id, chal.worker_id):
        raise HTTPException(status_code=403, detail="Only the author or the challenge owner can delete this idea")
    if sug.is_accepted_by_worker:
        chal.is_solved = False
    await db.execute(delete(SuggestionUpvote).where(SuggestionUpvote.suggestion_id == suggestion_id))
    await db.delete(sug)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _owned_challenge_for_suggestion(db: AsyncSession, user: User, suggestion_id: str):
    sug = (
        await db.execute(select(ChallengeSuggestion).where(ChallengeSuggestion.id == suggestion_id))
    ).scalar_one_or_none()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == sug.challenge_id))).scalar_one()
    if chal.worker_id != user.id:
        raise HTTPException(status_code=403, detail="Only the person who posted this challenge can accept a solution")
    return sug, chal


async def _challenge_response(db: AsyncSession, user: User, challenge_id: str) -> dict:
    db.expire_all()  # the bulk updates bypass the identity map; reload suggestions from the database
    chal = (await db.execute(select(WorkChallenge).where(WorkChallenge.id == challenge_id))).scalar_one()
    voted = await upvoted_suggestion_ids(db, user, [chal])
    return challenge_out(chal, voted)


@router.post("/suggestions/{suggestion_id}/accept", response_model=WorkChallengeResponse)
async def accept_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The challenge owner marks this suggestion as the solution. It replaces any earlier accepted
    suggestion and marks the challenge solved. Returns the updated challenge."""
    _, chal = await _owned_challenge_for_suggestion(db, user, suggestion_id)
    challenge_id = chal.id
    await db.execute(
        update(ChallengeSuggestion)
        .where(ChallengeSuggestion.challenge_id == challenge_id, ChallengeSuggestion.id != suggestion_id)
        .values(is_accepted_by_worker=False)
    )
    await db.execute(
        update(ChallengeSuggestion).where(ChallengeSuggestion.id == suggestion_id).values(is_accepted_by_worker=True)
    )
    await db.execute(update(WorkChallenge).where(WorkChallenge.id == challenge_id).values(is_solved=True))
    try:
        await db.commit()
    except IntegrityError:  # another accept on the same challenge landed at the same moment
        await db.rollback()
        raise HTTPException(status_code=409, detail="Another solution was just accepted. Refresh and try again.")
    return await _challenge_response(db, user, challenge_id)


@router.delete("/suggestions/{suggestion_id}/accept", response_model=WorkChallengeResponse)
async def unaccept_suggestion(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """The challenge owner withdraws the accepted solution, reopening the challenge. Idempotent."""
    sug, chal = await _owned_challenge_for_suggestion(db, user, suggestion_id)
    challenge_id = chal.id
    if sug.is_accepted_by_worker:
        await db.execute(
            update(ChallengeSuggestion)
            .where(ChallengeSuggestion.id == suggestion_id)
            .values(is_accepted_by_worker=False)
        )
        await db.execute(update(WorkChallenge).where(WorkChallenge.id == challenge_id).values(is_solved=False))
        await db.commit()
    return await _challenge_response(db, user, challenge_id)


@router.post("/suggestions/{suggestion_id}/upvote")
async def toggle_suggestion_upvote(
    suggestion_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await _toggle_upvote(
        db, user, ChallengeSuggestion, SuggestionUpvote, "suggestion_id", suggestion_id, "Suggestion not found"
    )


async def _toggle_upvote(db: AsyncSession, user: User, target_model, vote_model, fk_name: str, target_id: str, not_found: str):
    """One upvote per user per item; calling again removes it. Counter is updated atomically."""
    if (await db.execute(select(target_model.id).where(target_model.id == target_id))).first() is None:
        raise HTTPException(status_code=404, detail=not_found)

    fk = getattr(vote_model, fk_name)
    existing = (
        await db.execute(select(vote_model).where(vote_model.user_id == user.id, fk == target_id))
    ).scalar_one_or_none()

    if existing:
        await db.execute(delete(vote_model).where(vote_model.user_id == user.id, fk == target_id))
        delta, upvoted = -1, False
    else:
        db.add(vote_model(**{"user_id": user.id, fk_name: target_id}))
        delta, upvoted = 1, True

    try:
        await db.flush()
    except IntegrityError:  # concurrent double-click
        await db.rollback()
        raise HTTPException(status_code=409, detail="Vote already recorded")

    await db.execute(
        update(target_model).where(target_model.id == target_id).values(upvotes_count=target_model.upvotes_count + delta)
    )
    await db.commit()
    count = (await db.execute(select(target_model.upvotes_count).where(target_model.id == target_id))).scalar_one()
    return {"id": target_id, "upvoted": upvoted, "upvotes_count": count}
