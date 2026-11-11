"""Reference data: profession taxonomy and sign-up survey options (single source of truth)."""

CATEGORIES = [
    {
        "id": "cat_trades", "name": "Trades & Craftsmanship", "slug": "trades", "icon": "wrench",
        "popular_roles": ["Plumber", "Electrician", "HVAC Tech", "Carpenter", "Welder"],
    },
    {
        "id": "cat_transit", "name": "Transportation & Logistics", "slug": "transportation", "icon": "truck",
        "popular_roles": ["Bus Driver", "Airline Pilot", "Locomotive Engineer", "Heavy Freight Driver"],
    },
    {
        "id": "cat_legal_finance", "name": "Legal & Finance", "slug": "legal-finance", "icon": "briefcase",
        "popular_roles": ["Corporate Lawyer", "Auditor", "Tax Accountant", "Financial Analyst"],
    },
    {
        "id": "cat_tech", "name": "Technology & Engineering", "slug": "technology", "icon": "code",
        "popular_roles": ["DevOps Engineer", "Frontend Developer", "Cybersecurity Analyst", "Site Reliability Engineer"],
    },
    {
        "id": "cat_healthcare", "name": "Healthcare & Medicine", "slug": "healthcare", "icon": "heart-pulse",
        "popular_roles": ["ER Nurse", "Surgical Tech", "Paramedic", "Radiologist", "Physical Therapist"],
    },
    {
        "id": "cat_education", "name": "Education & Training", "slug": "education", "icon": "graduation-cap",
        "popular_roles": ["Teacher", "Professor", "Corporate Trainer", "School Counselor"],
    },
    {
        "id": "cat_hospitality", "name": "Food & Hospitality", "slug": "hospitality", "icon": "chef-hat",
        "popular_roles": ["Chef", "Baker", "Barista", "Hotel Manager"],
    },
    {
        "id": "cat_creative", "name": "Arts, Media & Design", "slug": "creative", "icon": "palette",
        "popular_roles": ["Graphic Designer", "Photographer", "Journalist", "Video Editor"],
    },
    {
        "id": "cat_science", "name": "Science & Research", "slug": "science", "icon": "flask-conical",
        "popular_roles": ["Lab Technician", "Biologist", "Data Scientist", "Environmental Scientist"],
    },
    {
        "id": "cat_public_service", "name": "Public Service & Safety", "slug": "public-service", "icon": "shield",
        "popular_roles": ["Firefighter", "Police Officer", "Social Worker", "Civil Servant"],
    },
]

OTHER_INDUSTRY = "Other"

# Interests a user can pick at sign-up (multi-select) = the industries above.
INTEREST_OPTIONS = [c["name"] for c in CATEGORIES]
INDUSTRY_OPTIONS = INTEREST_OPTIONS + [OTHER_INDUSTRY]
