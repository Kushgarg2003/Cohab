from app.models import SurveyResponse

# ========== Compatibility Matrices ==========

BUDGET_ADJACENCY = {
    "10k-25k":  {"10k-25k", "25k-50k"},
    "25k-50k":  {"10k-25k", "25k-50k", "50k-1L"},
    "50k-1L":   {"25k-50k", "50k-1L", "1L+"},
    "1L+":      {"50k-1L", "1L+"},
}

TIMELINE_ADJACENCY = {
    "ASAP":         {"ASAP", "1-month"},
    "1-month":      {"ASAP", "1-month", "2-3-months"},
    "2-3-months":   {"1-month", "2-3-months"},
}

# 0.0 = hard incompatible, 0.5 = tolerable, 1.0 = compatible
PETS_COMPAT = {
    ("have", "have"):   1.0,
    ("have", "love"):   1.0,
    ("have", "no"):     0.0,   # has pets vs allergic/dislike = hard conflict
    ("love", "love"):   1.0,
    ("love", "no"):     0.5,
    ("no",   "no"):     1.0,
}

SMOKING_COMPAT = {
    ("smoker",       "smoker"):        1.0,
    ("smoker",       "non-smoker"):    0.0,   # hard conflict
    ("smoker",       "outside-only"):  0.5,
    ("non-smoker",   "non-smoker"):    1.0,
    ("non-smoker",   "outside-only"):  0.5,
    ("outside-only", "outside-only"):  1.0,
}

DIETARY_COMPAT = {
    ("veg",     "veg"):     1.0,
    ("veg",     "non-veg"): 0.5,   # tolerable but not ideal
    ("non-veg", "non-veg"): 1.0,
}

GENDER_COMPAT = {
    ("male",    "male"):    1.0,
    ("male",    "female"):  0.0,   # hard conflict
    ("male",    "neutral"): 1.0,
    ("female",  "female"):  1.0,
    ("female",  "neutral"): 1.0,
    ("neutral", "neutral"): 1.0,
}

# ========== Helpers ==========

def _city(location: str) -> str:
    """Extract city prefix from 'City - Area' format."""
    return location.split(' - ')[0].strip() if ' - ' in location else location.strip()

def _jaccard(set_a: list, set_b: list) -> float:
    """Jaccard similarity between two tag lists."""
    a, b = set(set_a or []), set(set_b or [])
    if not a and not b:
        return 1.0   # both empty = neither cares = full match
    if not a or not b:
        return 0.5   # one empty = neutral
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0

def _dealbreaker_compat(val_a, val_b, matrix: dict) -> float:
    """
    Returns compatibility score (0.0, 0.5, or 1.0).
    If either side is None (not specified), returns 1.0 — no preference = compatible.
    """
    if val_a is None or val_b is None:
        return 1.0
    key = (val_a.value if hasattr(val_a, 'value') else val_a,
           val_b.value if hasattr(val_b, 'value') else val_b)
    return matrix.get(key) or matrix.get((key[1], key[0])) or 0.0


# ========== Main Scoring Function ==========

def compute_match_score(a: SurveyResponse, b: SurveyResponse) -> dict:
    """
    Compute compatibility score between two survey responses.
    Returns {"score": float 0-100, "breakdown": {...}}

    Architecture:
      Phase 1 — Hard gates: all must pass or score = 0
        - City overlap (must share at least one city)
        - Budget adjacency
        - Move-in timeline adjacency
        - Occupancy type exact match
        - No dealbreaker hard conflict (0.0 compatibility)

      Phase 2 — Scoring (ranking compatible pairs, 0-100):
        - Location area depth  : 15 pts
        - Budget quality       : 10 pts
        - Dealbreaker quality  : 20 pts
        - Lifestyle similarity : 55 pts (social 25 + habits 20 + work 10)
    """

    # ── Phase 1: Hard Gates ─────────────────────────────────────────────────

    # Gate 1: City-level location overlap (extract "City" from "City - Area")
    locs_a = list(a.locations or [])
    locs_b = list(b.locations or [])
    cities_a = {_city(l) for l in locs_a}
    cities_b = {_city(l) for l in locs_b}
    if not cities_a or not cities_b or not (cities_a & cities_b):
        return {"score": 0, "breakdown": {"disqualified": "no_city_overlap",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # Gate 2: Budget adjacency (skip gate if either hasn't filled it)
    budget_a = a.budget_range.value if a.budget_range else None
    budget_b = b.budget_range.value if b.budget_range else None
    if budget_a and budget_b and budget_b not in BUDGET_ADJACENCY.get(budget_a, set()):
        return {"score": 0, "breakdown": {"disqualified": "budget_mismatch",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # Gate 3: Move-in timeline adjacency
    timeline_a = a.move_in_timeline.value if a.move_in_timeline else None
    timeline_b = b.move_in_timeline.value if b.move_in_timeline else None
    if timeline_a and timeline_b and timeline_b not in TIMELINE_ADJACENCY.get(timeline_a, set()):
        return {"score": 0, "breakdown": {"disqualified": "timeline_mismatch",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # Gate 4: Occupancy type must match exactly
    if a.occupancy_type and b.occupancy_type and a.occupancy_type != b.occupancy_type:
        return {"score": 0, "breakdown": {"disqualified": "occupancy_mismatch",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # Gate 5: Dealbreaker hard conflicts (0.0 = instant disqualify)
    pets_c    = _dealbreaker_compat(a.pets,    b.pets,    PETS_COMPAT)
    smoking_c = _dealbreaker_compat(a.smoking, b.smoking, SMOKING_COMPAT)
    dietary_c = _dealbreaker_compat(a.dietary, b.dietary, DIETARY_COMPAT)
    gender_c  = _dealbreaker_compat(a.gender,  b.gender,  GENDER_COMPAT)

    if pets_c == 0.0 or smoking_c == 0.0 or dietary_c == 0.0 or gender_c == 0.0:
        return {"score": 0, "breakdown": {"disqualified": "dealbreaker_conflict",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # ── Phase 2: Scoring ────────────────────────────────────────────────────

    # Location area depth (15 pts) — bonus for matching exact areas, not just city
    set_a, set_b = set(locs_a), set(locs_b)
    area_jaccard = _jaccard(list(set_a), list(set_b))
    location_pts = round(area_jaccard * 15, 2)

    # Budget quality (10 pts) — exact match scores more than adjacent
    budget_pts = 10 if budget_a and budget_a == budget_b else 5

    # Dealbreaker quality (20 pts) — partial 0.5 matches reduce score
    dealbreaker_pts = round((pets_c + smoking_c + dietary_c + gender_c) / 4 * 20, 2)

    # Lifestyle similarity (55 pts)
    social_pts = round(_jaccard(a.social_battery, b.social_battery) * 25, 2)
    habits_pts = round(_jaccard(a.habits,         b.habits)         * 20, 2)
    work_pts   = round(_jaccard(a.work_study,     b.work_study)     * 10, 2)
    lifestyle_pts = round(social_pts + habits_pts + work_pts, 2)

    total = round(min(location_pts + budget_pts + dealbreaker_pts + lifestyle_pts, 100), 2)

    return {
        "score": total,
        "breakdown": {
            "hard_constraints": round(location_pts + budget_pts, 2),
            "dealbreakers":     dealbreaker_pts,
            "lifestyle":        lifestyle_pts,
        }
    }
