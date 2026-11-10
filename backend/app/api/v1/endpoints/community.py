from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.schemas.community import (
    TaskReviewCreate, TaskReviewResponse,
    QAQuestionCreate, QAQuestionResponse, QAAnswerCreate, QASessionResponse,
    WorkChallengeCreate, WorkChallengeResponse, ChallengeSuggestionCreate, ChallengeSuggestionResponse
)
import uuid

router = APIRouter()

MOCK_REVIEWS = [
    {
        "id": "rev_01",
        "post_id": "post_503",
        "user_id": "usr_999",
        "username": "law_student_sam",
        "user_avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
        "is_peer_verified": False,
        "reviewer_profession": "Law Student (2L)",
        "clarity_score": 5,
        "accuracy_score": 5,
        "feedback_text": "This FRCP Rule 45 breakdown explained 3rd-party log preservation better than my Civil Procedure textbook! The notice timing tip was gold.",
        "created_at": datetime.utcnow()
    }
]

MOCK_QA_QUESTIONS = [
    {
        "id": "qa_01",
        "worker_id": "usr_103",
        "asker_id": "usr_999",
        "asker_username": "law_student_sam",
        "asker_avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
        "question_text": "How many hours a week do litigation partners actually spend in the courtroom vs reviewing discovery documents at their desk?",
        "topic_tag": "Daily Routine & Hours",
        "answer_text": "In commercial litigation, about 85% of our time is actually research, strategy briefs, and depositions. Courtroom appearances happen for critical motions, hearings, and trials ~15% of the time.",
        "video_response_url": None,
        "is_answered": True,
        "upvotes_count": 42,
        "created_at": datetime.utcnow(),
        "answered_at": datetime.utcnow()
    },
    {
        "id": "qa_02",
        "worker_id": "usr_101",
        "asker_id": "usr_888",
        "asker_username": "homeowner_dave",
        "asker_avatar_url": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80",
        "question_text": "What is the #1 plumbing mistake you see homeowners make when attempting DIY drain repairs?",
        "topic_tag": "DIY Pitfalls",
        "answer_text": "Over-tightening PVC slip nuts until the rubber washer cracks, and pouring caustic chemical cleaners into old corroded pipes.",
        "video_response_url": None,
        "is_answered": True,
        "upvotes_count": 91,
        "created_at": datetime.utcnow(),
        "answered_at": datetime.utcnow()
    }
]

MOCK_CHALLENGES = [
    {
        "id": "chal_01",
        "worker_id": "usr_101",
        "worker_username": "sarah_plumber",
        "worker_profession_title": "Master Plumber",
        "worker_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "title": "Unusual water hammer knocking at 3 AM in a 1920s brick brownstone",
        "scenario_description": "We isolated all radiator loops, tested the expansion tank diaphragm (20 PSI intact), but the homeowner still reports loud knocking at 3 AM specifically. What subtle thermal siphon or solenoid issue would you test next?",
        "profession_category": "Plumbing",
        "media_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
        "urgency_level": "brainstorming",
        "is_solved": False,
        "created_at": datetime.utcnow(),
        "suggestions": [
            {
                "id": "sug_01",
                "challenge_id": "chal_01",
                "suggester_id": "usr_777",
                "suggester_username": "mike_hvac",
                "suggester_profession": "HVAC Specialist",
                "suggestion_text": "Check if an automatic ice maker or reverse osmosis filter solenoid valve cycles precisely at 3 AM with no arrestor installed on that branch line.",
                "suggested_tool_or_reference": "Mini in-line water hammer arrestor (1/4-inch push-fit)",
                "upvotes_count": 28,
                "is_accepted_by_worker": True,
                "created_at": datetime.utcnow()
            }
        ]
    }
]


# Reviews & Ratings
@router.get("/reviews/{post_id}", response_model=List[TaskReviewResponse])
async def get_task_reviews(post_id: str):
    return [r for r in MOCK_REVIEWS if r["post_id"] == post_id]


@router.post("/reviews", response_model=TaskReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_task_review(review_in: TaskReviewCreate):
    new_rev = {
        "id": f"rev_{uuid.uuid4().hex[:8]}",
        "post_id": review_in.post_id,
        "user_id": "usr_current",
        "username": "active_explorer",
        "user_avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
        "is_peer_verified": bool(review_in.reviewer_profession),
        "reviewer_profession": review_in.reviewer_profession,
        "clarity_score": review_in.clarity_score,
        "accuracy_score": review_in.accuracy_score,
        "feedback_text": review_in.feedback_text,
        "created_at": datetime.utcnow()
    }
    MOCK_REVIEWS.insert(0, new_rev)
    return new_rev


# Q&A Segments
@router.get("/qa/{worker_id}", response_model=QASessionResponse)
async def get_worker_qa(worker_id: str):
    worker_questions = [q for q in MOCK_QA_QUESTIONS if q["worker_id"] == worker_id]
    answered = [q for q in worker_questions if q["is_answered"]]
    return {
        "worker_id": worker_id,
        "worker_name": "Elena Vance, Esq." if worker_id == "usr_103" else "Sarah Jenkins",
        "worker_profession": "Litigation Attorney" if worker_id == "usr_103" else "Master Plumber",
        "total_questions": len(worker_questions),
        "answered_questions": len(answered),
        "questions": worker_questions
    }


@router.post("/qa/{worker_id}/ask", response_model=QAQuestionResponse, status_code=status.HTTP_201_CREATED)
async def ask_worker_question(worker_id: str, q_in: QAQuestionCreate):
    new_q = {
        "id": f"qa_{uuid.uuid4().hex[:8]}",
        "worker_id": worker_id,
        "asker_id": "usr_current",
        "asker_username": "curious_user",
        "asker_avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80",
        "question_text": q_in.question_text,
        "topic_tag": q_in.topic_tag or "General Inquiry",
        "answer_text": None,
        "video_response_url": None,
        "is_answered": False,
        "upvotes_count": 0,
        "created_at": datetime.utcnow(),
        "answered_at": None
    }
    MOCK_QA_QUESTIONS.insert(0, new_q)
    return new_q


# Problem & Challenge Crowdsourcing
@router.get("/challenges", response_model=List[WorkChallengeResponse])
async def get_work_challenges(category: Optional[str] = None):
    chals = MOCK_CHALLENGES
    if category:
        chals = [c for c in chals if c["profession_category"].lower() == category.lower()]
    return chals


@router.post("/challenges", response_model=WorkChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(chal_in: WorkChallengeCreate):
    new_chal = {
        "id": f"chal_{uuid.uuid4().hex[:8]}",
        "worker_id": "usr_101",
        "worker_username": "sarah_plumber",
        "worker_profession_title": "Master Plumber",
        "worker_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "title": chal_in.title,
        "scenario_description": chal_in.scenario_description,
        "profession_category": chal_in.profession_category,
        "media_url": chal_in.media_url,
        "urgency_level": chal_in.urgency_level,
        "is_solved": False,
        "suggestions": [],
        "created_at": datetime.utcnow()
    }
    MOCK_CHALLENGES.insert(0, new_chal)
    return new_chal


@router.post("/challenges/{challenge_id}/suggest", response_model=ChallengeSuggestionResponse, status_code=status.HTTP_201_CREATED)
async def submit_challenge_suggestion(challenge_id: str, sug_in: ChallengeSuggestionCreate):
    for c in MOCK_CHALLENGES:
        if c["id"] == challenge_id:
            new_sug = {
                "id": f"sug_{uuid.uuid4().hex[:8]}",
                "challenge_id": challenge_id,
                "suggester_id": "usr_current",
                "suggester_username": "expert_peer",
                "suggester_profession": "Peer Professional",
                "suggestion_text": sug_in.suggestion_text,
                "suggested_tool_or_reference": sug_in.suggested_tool_or_reference,
                "upvotes_count": 0,
                "is_accepted_by_worker": False,
                "created_at": datetime.utcnow()
            }
            c["suggestions"].append(new_sug)
            return new_sug
    raise HTTPException(status_code=404, detail="Challenge not found")
