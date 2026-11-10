from fastapi import APIRouter, HTTPException, status
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.schemas.profession import ProfessionResponse
from datetime import datetime
import uuid

router = APIRouter()

# Mock in-memory storage for initial scaffolding / verification
MOCK_USERS = {
    "sarah_plumber": {
        "id": "usr_101",
        "username": "sarah_plumber",
        "email": "sarah@tradespro.com",
        "full_name": "Sarah Jenkins",
        "bio": "Master Plumber | 10+ yrs in commercial pipe systems & troubleshooting",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "followers_count": 14200,
        "following_count": 310,
        "posts_count": 48,
        "profession": {
            "id": "prof_101",
            "user_id": "usr_101",
            "industry": "Trades & Construction",
            "title": "Master Plumber",
            "specialization": "Commercial & Residential Diagnostics",
            "years_of_experience": 10,
            "is_verified_pro": True,
            "company_or_freelance": "Jenkins Plumbing LLC",
            "key_tools": ["Pipe Wrench", "Drain Snake", "Infrared Thermal Camera", "PEX Crimper"]
        }
    },
    "alex_driver": {
        "id": "usr_102",
        "username": "alex_driver",
        "email": "alex@citytransit.org",
        "full_name": "Alex Rivera",
        "bio": "City Transit Bus Driver | Navigating 40ft electric buses through dense rush hours",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "followers_count": 8900,
        "following_count": 140,
        "posts_count": 29,
        "profession": {
            "id": "prof_102",
            "user_id": "usr_102",
            "industry": "Transportation & Logistics",
            "title": "Transit Bus Operator",
            "specialization": "Articulated & Electric Fleet",
            "years_of_experience": 6,
            "is_verified_pro": True,
            "company_or_freelance": "Metro Express Transit",
            "key_tools": ["Fleet Telematics", "Route Dispatch System", "Defensive Driving Radar"]
        },
        "elena_lawyer": {
            "id": "usr_103",
            "username": "elena_lawyer",
            "email": "elena@vancelegal.com",
            "full_name": "Elena Vance, Esq.",
            "bio": "Commercial Litigation Partner | Tech Contracts, IP Disputes, and Courtroom Strategy",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "followers_count": 21500,
            "following_count": 420,
            "posts_count": 62,
            "profession": {
                "id": "prof_103",
                "user_id": "usr_103",
                "industry": "Legal & Regulatory",
                "title": "Commercial Litigation Attorney",
                "specialization": "IP & Breach of Contract Disputes",
                "years_of_experience": 12,
                "is_verified_pro": True,
                "company_or_freelance": "Vance & Associates Law",
                "key_tools": ["Westlaw", "LexisNexis", "Clio Litigation Suite", "Adobe Pro Redaction"]
            }
        }
    }
}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    if user_in.username in MOCK_USERS:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_id = str(uuid.uuid4())
    prof_dict = None
    if user_in.profession:
        prof_dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            **user_in.profession.model_dump()
        }
    
    new_user = {
        "id": user_id,
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "bio": user_in.bio,
        "avatar_url": user_in.avatar_url,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "followers_count": 0,
        "following_count": 0,
        "posts_count": 0,
        "profession": prof_dict
    }
    MOCK_USERS[user_in.username] = new_user
    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = MOCK_USERS.get(credentials.username_or_email)
    if not user:
        # Check by email
        for u in MOCK_USERS.values():
            if u["email"] == credentials.username_or_email:
                user = u
                break
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "access_token": f"mock-token-for-{user['id']}",
        "token_type": "bearer",
        "user": user
    }


@router.get("/users/{username}", response_model=UserResponse)
async def get_user_profile(username: str):
    user = MOCK_USERS.get(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
