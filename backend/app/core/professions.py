"""The built-in profession catalog: which professions exist and the field each belongs to.

The descriptions, tasks and tools (in every language) live in the website (frontend/src/catalog/); the server only
needs the list, to check what people pick and to group them. professions.json is a copy of
frontend/src/catalog/professions.json (tests/test_catalog.py fails if they differ).
"""
import json
from pathlib import Path

CATALOG = json.loads((Path(__file__).with_name("professions.json")).read_text(encoding="utf-8"))
FIELD_OF = {p["slug"]: p["field"] for p in CATALOG}
