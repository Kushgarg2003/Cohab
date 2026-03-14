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

# Compatibility score (0.0 to 1.0) for each dealbreaker pair
PETS_COMPAT = {
    ("have", "have"):   1.0,
    ("have", "love"):   1.0,
    ("have", "no"):     0.0,
    ("love", "love"):   1.0,
    ("love", "no"):     0.5,
    ("no",   "no"):     1.0,
}

SMOKING_COMPAT = {
    ("smoker",       "smoker"):        1.0,
    ("smoker",       "non-smoker"):    0.0,
    ("smoker",       "outside-only"):  0.5,
    ("non-smoker",   "non-smoker"):    1.0,
    ("non-smoker",   "outside-only"):  0.5,
    ("outside-only", "outside-only"):  1.0,
}

DIETARY_COMPAT = {
    ("veg",     "veg"):     1.0,
    ("veg",     "non-veg"): 0.5,
    ("non-veg", "non-veg"): 1.0,
}

GENDER_COMPAT = {
    ("male",    "male"):    1.0,
    ("male",    "female"):  0.0,
    ("male",    "neutral"): 1.0,
    ("female",  "female"):  1.0,
    ("female",  "neutral"): 1.0,
    ("neutral", "neutral"): 1.0,
}

# ========== Scoring Functions ==========

def _jaccard(set_a: list, set_b: list) -> float:
    """Jaccard similarity between two tag lists."""
    a, b = set(set_a or []), set(set_b or [])
    if not a and not b:
        return 1.0  # both empty = neither cares = full match
    if not a or not b:
        return 0.5  # one empty = neutral
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union > 0 else 0.0


def _dealbreaker_score(val_a, val_b, matrix: dict) -> float:
    """Look up compatibility score. If either side is None, award full points."""
    if val_a is None or val_b is None:
        return 1.0
    key = (val_a.value if hasattr(val_a, 'value') else val_a,
           val_b.value if hasattr(val_b, 'value') else val_b)
    # Try both orderings
    return matrix.get(key) or matrix.get((key[1], key[0])) or 0.0


def compute_match_score(a: SurveyResponse, b: SurveyResponse) -> dict:
    """
    Compute compatibility score between two survey responses.
    Returns {"score": float, "breakdown": {...}}
    Score is 0-100.
    """

    # --- Tier 1: Hard Constraints (40 pts, binary gate) ---
    hard_pts = 0.0

    # Budget adjacency
    budget_a = a.budget_range.value if a.budget_range else None
    budget_b = b.budget_range.value if b.budget_range else None
    if budget_a and budget_b and budget_b in BUDGET_ADJACENCY.get(budget_a, set()):
        hard_pts += 10

    # Location overlap
    locs_a = set(a.locations or [])
    locs_b = set(b.locations or [])
    if locs_a and locs_b and locs_a & locs_b:
        hard_pts += 10

    # Move-in timeline adjacency
    timeline_a = a.move_in_timeline.value if a.move_in_timeline else None
    timeline_b = b.move_in_timeline.value if b.move_in_timeline else None
    if timeline_a and timeline_b and timeline_b in TIMELINE_ADJACENCY.get(timeline_a, set()):
        hard_pts += 10

    # Occupancy type must match exactly
    if a.occupancy_type and b.occupancy_type and a.occupancy_type == b.occupancy_type:
        hard_pts += 10

    # Hard gate: if less than 30/40, incompatible — return early
    if hard_pts < 30:
        return {
            "score": round(hard_pts, 2),
            "breakdown": {
                "hard_constraints": round(hard_pts, 2),
                "dealbreakers": 0.0,
                "lifestyle": 0.0,
            }
        }

    # --- Tier 2: Dealbreakers (25 pts) ---
    pets_score    = _dealbreaker_score(a.pets, b.pets, PETS_COMPAT) * 6.25
    smoking_score = _dealbreaker_score(a.smoking, b.smoking, SMOKING_COMPAT) * 6.25
    dietary_score = _dealbreaker_score(a.dietary, b.dietary, DIETARY_COMPAT) * 6.25
    gender_score  = _dealbreaker_score(a.gender, b.gender, GENDER_COMPAT) * 6.25
    dealbreaker_pts = round(pets_score + smoking_score + dietary_score + gender_score, 2)

    # --- Tier 3: Lifestyle (35 pts) ---
    social_score   = _jaccard(a.social_battery, b.social_battery) * 15
    habits_score   = _jaccard(a.habits, b.habits) * 12
    work_score     = _jaccard(a.work_study, b.work_study) * 8
    lifestyle_pts  = round(social_score + habits_score + work_score, 2)

    total = round(hard_pts + dealbreaker_pts + lifestyle_pts, 2)

    return {
        "score": total,
        "breakdown": {
            "hard_constraints": round(hard_pts, 2),
            "dealbreakers": round(dealbreaker_pts, 2),
            "lifestyle": round(lifestyle_pts, 2),
        }
    }
