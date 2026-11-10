from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

CATEGORIES = [
    {
        "id": "cat_trades",
        "name": "Trades & Craftsmanship",
        "slug": "trades",
        "icon": "wrench",
        "professions_count": 48,
        "active_stories_count": 120,
        "popular_roles": ["Plumber", "Electrician", "HVAC Tech", "Carpenter", "Welder"]
    },
    {
        "id": "cat_transit",
        "name": "Transportation & Logistics",
        "slug": "transportation",
        "icon": "truck",
        "professions_count": 32,
        "active_stories_count": 85,
        "popular_roles": ["Bus Driver", "Airline Pilot", "Locomotive Engineer", "Heavy Freight Driver"]
    },
    {
        "id": "cat_legal_finance",
        "name": "Legal & Finance",
        "slug": "legal-finance",
        "icon": "briefcase",
        "professions_count": 28,
        "active_stories_count": 64,
        "popular_roles": ["Corporate Lawyer", "Auditor", "Tax Accountant", "Financial Analyst"]
    },
    {
        "id": "cat_tech",
        "name": "Technology & Engineering",
        "slug": "technology",
        "icon": "code",
        "professions_count": 65,
        "active_stories_count": 210,
        "popular_roles": ["DevOps Engineer", "Frontend Developer", "Cybersecurity Analyst", "Site Reliability Engineer"]
    },
    {
        "id": "cat_healthcare",
        "name": "Healthcare & Medicine",
        "slug": "healthcare",
        "icon": "heart-pulse",
        "professions_count": 40,
        "active_stories_count": 150,
        "popular_roles": ["ER Nurse", "Surgical Tech", "Paramedic", "Radiologist", "Physical Therapist"]
    }
]


@router.get("/categories")
async def get_profession_categories():
    """Returns available profession taxonomy and industry categories."""
    return CATEGORIES


@router.get("/search")
async def search_professions_and_tasks(
    q: str = Query(..., min_length=1, description="Search term for profession, task, or tool")
):
    """Searches across professions, job titles, and workflow topics."""
    query_lower = q.lower()
    matching_categories = [
        c for c in CATEGORIES 
        if query_lower in c["name"].lower() or any(query_lower in r.lower() for r in c["popular_roles"])
    ]
    return {
        "query": q,
        "matching_categories": matching_categories
    }
