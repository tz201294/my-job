from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.schemas.post import PostResponse, PostCreate, PostType
from app.schemas.task import TaskDifficulty
import uuid

router = APIRouter()

MOCK_POSTS = [
    {
        "id": "post_503",
        "author_id": "usr_103",
        "author_username": "elena_lawyer",
        "author_full_name": "Elena Vance, Esq.",
        "author_avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Commercial Litigation Attorney",
        "is_author_verified": True,
        "title": "Mastering the Subpoena Duces Tecum: How to Compel Critical Evidence Step-by-Step",
        "caption": "A breakdown of how litigation attorneys draft, scope, and serve third-party discovery subpoenas without getting them quashed.",
        "post_type": PostType.PRO_CASE_STUDY,
        "media": [
            {
                "url": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
                "media_type": "image",
                "caption": "Redacted discovery schedule and document request riders"
            }
        ],
        "tags": ["law", "litigation", "legalpractice", "subpoena", "evidence"],
        "likes_count": 1450,
        "comments_count": 88,
        "is_liked_by_me": False,
        "is_bookmarked_by_me": False,
        "task_details": {
            "id": "task_503",
            "post_id": "post_503",
            "problem_statement": "In a corporate breach of contract dispute, the opposing party claimed all server logs were deleted. We needed to compel the third-party cloud hosting provider to preserve and produce the unedited audit logs before statutory deadlines.",
            "category": "Legal",
            "difficulty": TaskDifficulty.EXPERT,
            "estimated_time_mins": 180,
            "tools_used": ["Westlaw / LexisNexis", "Federal Rules of Civil Procedure (Rule 45)", "PDF Redaction Suite", "Licensed Process Server"],
            "safety_warnings": "Ensure proper notice to all parties prior to service to prevent sanctions under FRCP 45(a)(4).",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Draft Narrowly Tailored Document Requests (Schedule A)",
                    "description": "Avoid overly broad catch-alls that invite undue burden motions. Specify exact server log date ranges, IP tables, and user authentication records.",
                    "image_url": "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
                    "tip": "Define technical terms clearly so IT custodians cannot exploit ambiguities."
                },
                {
                    "step_number": 2,
                    "title": "Issue Mandatory Notice of Intent to Serve",
                    "description": "Serve a copy of the subpoena on all parties to the action at least 5 business days before service on the third-party witness.",
                    "image_url": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
                    "tip": "Retain timestamped electronic service receipts in the litigation docket."
                },
                {
                    "step_number": 3,
                    "title": "Execute Personal Service & Monitor Compliance",
                    "description": "Engage a certified process server in the target jurisdiction. Track the 14-day statutory objection window.",
                    "image_url": "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80",
                    "tip": "Follow up with a courteous call to the cloud provider's in-house legal counsel to clarify file delivery formats."
                }
            ]
        },
        "created_at": datetime.utcnow()
    },
    {
        "id": "post_501",
        "author_id": "usr_101",
        "author_username": "sarah_plumber",
        "author_full_name": "Sarah Jenkins",
        "author_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Master Plumber",
        "is_author_verified": True,
        "title": "Fixing a high-pressure brass valve leak in a multi-story commercial building",
        "caption": "Walkthrough of diagnosing water hammer and swapping out a compromised 2-inch pressure reducing valve.",
        "post_type": PostType.TASK_WALKTHROUGH,
        "media": [
            {
                "url": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80",
                "media_type": "image",
                "caption": "Initial gauge reading: pressure spiking to 110 PSI"
            }
        ],
        "tags": ["plumbing", "commercialtrades", "valverepair", "waterhammer"],
        "likes_count": 894,
        "comments_count": 42,
        "is_liked_by_me": False,
        "is_bookmarked_by_me": False,
        "task_details": {
            "id": "task_501",
            "post_id": "post_501",
            "problem_statement": "Commercial building main riser experiencing severe hydraulic shock (water hammer) caused by a failing pressure regulating valve.",
            "category": "Plumbing",
            "difficulty": TaskDifficulty.ADVANCED,
            "estimated_time_mins": 90,
            "tools_used": ["24-inch Pipe Wrench", "Digital Pressure Manometer", "PTFE Thread Sealant", "Flange Spreader"],
            "safety_warnings": "Depressurize the riser and tag out before breaking flanges.",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Isolate the Riser Section",
                    "description": "Close upstream and downstream isolation ball valves and lock out the supply pump.",
                    "image_url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
                    "tip": "Always bleed residual pressure through test cock before loosening bolts."
                },
                {
                    "step_number": 2,
                    "title": "Extract Damaged Diaphragm & Seat",
                    "description": "Unbolt the valve bonnet and inspect for cavitation pitting on the brass valve seat.",
                    "image_url": "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80",
                    "tip": "Clean gasket mating surfaces with a brass wire brush."
                },
                {
                    "step_number": 3,
                    "title": "Install New PRV Cartridge & Calibrate",
                    "description": "Torque bolts in a crisscross pattern and calibrate the set screw to 55 PSI dynamic pressure.",
                    "image_url": "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80",
                    "tip": "Slowly open upstream valve to prevent sudden surge."
                }
            ]
        },
        "created_at": datetime.utcnow()
    },
    {
        "id": "post_502",
        "author_id": "usr_102",
        "author_username": "alex_driver",
        "author_full_name": "Alex Rivera",
        "author_avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Transit Bus Operator",
        "is_author_verified": True,
        "title": "Downtown rush-hour route navigation: Maneuvering a 60ft articulated hybrid",
        "caption": "How we manage tight right turns, blind spot clearance, and passenger stop pacing during peak rain hours.",
        "post_type": PostType.TASK_WALKTHROUGH,
        "media": [
            {
                "url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
                "media_type": "image",
                "caption": "Mirror scan checklist before entering roundabout"
            }
        ],
        "tags": ["transit", "busdriver", "citylogistics", "roadsafety"],
        "likes_count": 612,
        "comments_count": 19,
        "is_liked_by_me": False,
        "is_bookmarked_by_me": False,
        "task_details": {
            "id": "task_502",
            "post_id": "post_502",
            "problem_statement": "Managing tail-swing and cyclist blindspots when making tight 90-degree intersection turns in historic city corridors.",
            "category": "Transportation",
            "difficulty": TaskDifficulty.INTERMEDIATE,
            "estimated_time_mins": 45,
            "tools_used": ["Curb Convex Mirrors", "Telematics Route Tablet", "Pneumatic Kneeling Suspension"],
            "safety_warnings": "Never initiate turn until pedestrian countdown is zero.",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Establish Approach Lane & Pivot Point",
                    "description": "Position front wheels 4 feet from curb and maintain lane ownership to prevent lane intrusions.",
                    "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80",
                    "tip": "Keep eye on right rear pivot axle."
                },
                {
                    "step_number": 2,
                    "title": "Complete Sweeping Arc & Smooth Acceleration",
                    "description": "Counter-steer smoothly once the articulation joint clears the curb edge.",
                    "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
                    "tip": "Feather regenerative braking for passenger comfort."
                }
            ]
        },
        "created_at": datetime.utcnow()
    }
]


@router.get("/feed", response_model=List[PostResponse])
async def get_feed(
    post_type: Optional[PostType] = None,
    profession_category: Optional[str] = None,
    limit: int = 20
):
    """Main feed endpoint with optional filters by post type and profession category."""
    posts = MOCK_POSTS
    if post_type:
        posts = [p for p in posts if p["post_type"] == post_type]
    if profession_category:
        posts = [
            p for p in posts 
            if p.get("task_details") and p["task_details"]["category"].lower() == profession_category.lower()
        ]
    return posts[:limit]


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post_in: PostCreate):
    """Creates a new post or task walkthrough."""
    post_id = f"post_{uuid.uuid4().hex[:8]}"
    
    task_resp = None
    if post_in.task_details:
        task_resp = {
            "id": f"task_{uuid.uuid4().hex[:8]}",
            "post_id": post_id,
            **post_in.task_details.model_dump()
        }
    
    new_post = {
        "id": post_id,
        "author_id": "usr_101",
        "author_username": "sarah_plumber",
        "author_full_name": "Sarah Jenkins",
        "author_avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "author_profession_title": "Master Plumber",
        "is_author_verified": True,
        "title": post_in.title,
        "caption": post_in.caption,
        "post_type": post_in.post_type,
        "media": [m.model_dump() for m in post_in.media],
        "tags": post_in.tags,
        "likes_count": 0,
        "comments_count": 0,
        "is_liked_by_me": False,
        "is_bookmarked_by_me": False,
        "task_details": task_resp,
        "created_at": datetime.utcnow()
    }
    MOCK_POSTS.insert(0, new_post)
    return new_post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post_by_id(post_id: str):
    for p in MOCK_POSTS:
        if p["id"] == post_id:
            return p
    raise HTTPException(status_code=404, detail="Post not found")


@router.post("/{post_id}/like")
async def toggle_like(post_id: str):
    for p in MOCK_POSTS:
        if p["id"] == post_id:
            p["is_liked_by_me"] = not p["is_liked_by_me"]
            p["likes_count"] += 1 if p["is_liked_by_me"] else -1
            return {"post_id": post_id, "is_liked": p["is_liked_by_me"], "likes_count": p["likes_count"]}
    raise HTTPException(status_code=404, detail="Post not found")
