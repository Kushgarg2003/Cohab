from app.models import SurveyResponse

# ========== Compatibility Matrices ==========

BUDGET_ADJACENCY = {
    "10k-15k":  {"10k-15k", "15k-20k"},
    "15k-20k":  {"10k-15k", "15k-20k", "20k-30k"},
    "20k-30k":  {"15k-20k", "20k-30k", "30k-50k"},
    "30k-50k":  {"20k-30k", "30k-50k", "50k+"},
    "50k+":     {"30k-50k", "50k+"},
    # Legacy support
    "10k-25k":  {"10k-25k", "25k-50k", "10k-15k", "15k-20k", "20k-30k"},
    "25k-50k":  {"10k-25k", "25k-50k", "50k-1L", "20k-30k", "30k-50k"},
    "50k-1L":   {"25k-50k", "50k-1L", "1L+", "30k-50k", "50k+"},
    "1L+":      {"50k-1L", "1L+", "50k+"},
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

# Maps (gender_preference, actual_gender) → compatibility
# e.g. User A prefers "female" and User B's actual gender is "male" → 0.0 conflict
GENDER_PREF_COMPAT = {
    ("male",    "male"):    1.0,
    ("male",    "female"):  0.0,
    ("male",    "other"):   0.5,
    ("female",  "male"):    0.0,
    ("female",  "female"):  1.0,
    ("female",  "other"):   0.5,
    ("neutral", "male"):    1.0,
    ("neutral", "female"):  1.0,
    ("neutral", "other"):   1.0,
}

# Values that mean "no strong preference" — treated same as None in scoring
NEUTRAL_PREF_VALUES = {
    "gender":  {"neutral"},
    "pets":    {"love"},          # "I love pets, would be great if they had one" — not a constraint
    "smoking": {"outside-only"},  # "Outside-only smoking is fine with me" — accepts either
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

def _effective_pref(field, value):
    """Returns None if value is a neutral/open preference, else returns value."""
    if value is None:
        return None
    v = value.value if hasattr(value, 'value') else value
    return None if v in NEUTRAL_PREF_VALUES.get(field, set()) else value

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

def compute_match_score(a: SurveyResponse, b: SurveyResponse,
                        user_a_gender: str = None, user_b_gender: str = None) -> dict:
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

    # Location lists (used in both gates and scoring)
    locs_a = list(a.locations or [])
    locs_b = list(b.locations or [])

    # Gate 2: Budget adjacency — supports multi-range (any overlap = pass)
    ranges_a = list(a.budget_ranges or ([a.budget_range.value] if a.budget_range else []))
    ranges_b = list(b.budget_ranges or ([b.budget_range.value] if b.budget_range else []))
    if ranges_a and ranges_b:
        adjacent = any(rb in BUDGET_ADJACENCY.get(ra, set()) for ra in ranges_a for rb in ranges_b)
        if not adjacent:
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

    # Gender: resolve neutral → None, then check A's pref vs B's actual gender and vice versa
    eff_gender_a = _effective_pref("gender", a.gender)
    eff_gender_b = _effective_pref("gender", b.gender)
    pref_a = eff_gender_a.value if eff_gender_a and hasattr(eff_gender_a, 'value') else eff_gender_a
    pref_b = eff_gender_b.value if eff_gender_b and hasattr(eff_gender_b, 'value') else eff_gender_b
    def _gender_pref_score(pref, actual):
        if pref is None or actual is None:
            return 1.0  # no info = no conflict
        return GENDER_PREF_COMPAT.get((pref, actual), 0.0)
    gender_c = min(_gender_pref_score(pref_a, user_b_gender), _gender_pref_score(pref_b, user_a_gender))

    if pets_c == 0.0 or smoking_c == 0.0 or dietary_c == 0.0 or gender_c == 0.0:
        return {"score": 0, "breakdown": {"disqualified": "dealbreaker_conflict",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # ── Phase 2: Scoring ────────────────────────────────────────────────────

    # Location area depth (15 pts) — bonus for matching exact areas, not just city
    set_a, set_b = set(locs_a), set(locs_b)
    area_jaccard = _jaccard(list(set_a), list(set_b))
    location_pts = round(area_jaccard * 15, 2)

    # Budget quality (10 pts) — exact overlap scores more than adjacent only
    exact_overlap = any(ra == rb for ra in ranges_a for rb in ranges_b)
    budget_pts = 10 if exact_overlap else 5

    # Dealbreaker quality (20 pts) — dynamic denominator: only count fields where
    # at least one user expressed a clear (non-neutral) preference
    eff_pets_a    = _effective_pref("pets",    a.pets)
    eff_pets_b    = _effective_pref("pets",    b.pets)
    eff_smoking_a = _effective_pref("smoking", a.smoking)
    eff_smoking_b = _effective_pref("smoking", b.smoking)

    active_sum, active_count = 0.0, 0
    for eff_a, eff_b, compat in [
        (eff_pets_a,    eff_pets_b,    pets_c),
        (eff_smoking_a, eff_smoking_b, smoking_c),
        (a.dietary,     b.dietary,     dietary_c),
    ]:
        if eff_a is not None or eff_b is not None:
            active_sum += compat
            active_count += 1
    if eff_gender_a is not None or eff_gender_b is not None:
        active_sum += gender_c
        active_count += 1
    dealbreaker_pts = 20.0 if active_count == 0 else round(active_sum / active_count * 20, 2)

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
