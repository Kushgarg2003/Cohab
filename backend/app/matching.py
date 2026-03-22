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
    # New values
    ("smoker-prefer-smoker", "smoker-prefer-smoker"): 1.0,
    ("smoker-prefer-smoker", "non-smoker"):           0.0,   # hard conflict
    ("smoker-prefer-smoker", "indifferent"):          1.0,
    ("non-smoker",           "non-smoker"):           1.0,
    ("non-smoker",           "indifferent"):          1.0,
    ("indifferent",          "indifferent"):          1.0,
    # Legacy backward-compat values
    ("smoker",       "smoker"):                       1.0,
    ("smoker",       "non-smoker"):                   0.0,
    ("smoker",       "outside-only"):                 1.0,
    ("smoker",       "smoker-prefer-smoker"):         1.0,
    ("smoker",       "indifferent"):                  1.0,
    ("non-smoker",   "outside-only"):                 1.0,
    ("outside-only", "outside-only"):                 1.0,
    ("outside-only", "smoker-prefer-smoker"):         1.0,
    ("outside-only", "indifferent"):                  1.0,
    ("smoker-prefer-smoker", "outside-only"):         1.0,
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
    "pets":    {"love"},                        # "I love pets" — aspirational, not a constraint
    "smoking": {"outside-only", "indifferent"}, # both legacy + new neutral values
}

# ========== Helpers ==========

# All standard "City - Area" options from the survey.
# Used to resolve custom free-text locations to a known city.
_STANDARD_LOCATIONS = [
    "Bangalore - Koramangala", "Bangalore - Indiranagar", "Bangalore - HSR Layout",
    "Bangalore - Whitefield", "Bangalore - Electronic City", "Bangalore - Marathahalli",
    "Bangalore - Bellandur", "Bangalore - Sarjapur Road", "Bangalore - Bannerghatta Road",
    "Bangalore - JP Nagar", "Bangalore - Jayanagar", "Bangalore - Hebbal",
    "Bangalore - Yelahanka", "Bangalore - Rajajinagar",
    "Mumbai - BKC", "Mumbai - Andheri", "Mumbai - Powai", "Mumbai - Thane",
    "Mumbai - Bandra", "Mumbai - Malad", "Mumbai - Goregaon", "Mumbai - Borivali",
    "Mumbai - Worli", "Mumbai - Navi Mumbai",
    "Hyderabad - Gachibowli", "Hyderabad - Hitech City", "Hyderabad - Kondapur",
    "Hyderabad - Banjara Hills", "Hyderabad - Jubilee Hills", "Hyderabad - Madhapur",
    "Hyderabad - Miyapur", "Hyderabad - Begumpet",
    "Delhi - Connaught Place", "Delhi - Lajpat Nagar", "Delhi - Dwarka",
    "Delhi - Hauz Khas", "Delhi - Saket", "Delhi - Vasant Kunj",
    "Delhi - Rohini", "Delhi - Nehru Place",
    "Gurgaon - Cyber City", "Gurgaon - Sohna Road", "Gurgaon - Golf Course Road",
    "Gurgaon - MG Road", "Gurgaon - DLF Phase 1", "Gurgaon - DLF Phase 2",
    "Gurgaon - Sector 56",
    "Noida - Sector 62", "Noida - Sector 18", "Noida - Greater Noida",
    "Noida - Sector 137", "Noida - Sector 50", "Noida - Expressway",
    "Pune - Hinjewadi", "Pune - Kothrud", "Pune - Baner",
    "Pune - Viman Nagar", "Pune - Wakad", "Pune - Aundh",
    "Pune - Magarpatta", "Pune - Hadapsar", "Pune - Pimpri-Chinchwad",
    "Chennai - OMR", "Chennai - Anna Nagar", "Chennai - Velachery",
    "Chennai - T Nagar", "Chennai - Adyar", "Chennai - Porur",
    "Chennai - Guindy", "Chennai - Sholinganallur",
    "Kolkata - Salt Lake", "Kolkata - Rajarhat", "Kolkata - New Town",
    "Kolkata - Park Street", "Kolkata - Ballygunge", "Kolkata - Howrah",
    "Ahmedabad - SG Highway", "Ahmedabad - Prahlad Nagar",
    "Ahmedabad - Satellite", "Ahmedabad - Bodakdev",
    "Indore - Vijay Nagar", "Indore - AB Road", "Indore - Scheme 54",
    "Jaipur - Vaishali Nagar", "Jaipur - C Scheme", "Jaipur - Malviya Nagar",
]

# Build area-keyword → city lookup (lowercase area words → city name)
_AREA_TO_CITY: dict[str, str] = {}
for _loc in _STANDARD_LOCATIONS:
    _c, _a = _loc.split(' - ', 1)
    # index every word in the area name for flexible keyword matching
    for _word in _a.lower().split():
        if len(_word) >= 3:
            _AREA_TO_CITY.setdefault(_word, _c)
    _AREA_TO_CITY.setdefault(_a.lower(), _c)   # also index full area name
    _AREA_TO_CITY.setdefault(_c.lower(), _c)   # city name maps to itself


def _city(location: str) -> str:
    """
    Extract city from a location string.
    - Standard format 'City - Area'  → returns 'City'
    - Custom free-text (no ' - ')    → tries to resolve to a known city
      via keyword lookup; falls back to the raw string if unrecognised.
    """
    if ' - ' in location:
        return location.split(' - ')[0].strip()
    raw = location.strip()
    lower = raw.lower()
    # Exact full-string match first
    if lower in _AREA_TO_CITY:
        return _AREA_TO_CITY[lower]
    # Word-level match: if any significant word resolves to a city, use it
    for word in lower.split():
        if word in _AREA_TO_CITY:
            return _AREA_TO_CITY[word]
    # Substring match: check if custom text contains a known area name
    for area_key, city_name in _AREA_TO_CITY.items():
        if len(area_key) >= 4 and area_key in lower:
            return city_name
    return raw  # truly unknown — treated as its own city (matches others who put same)

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

    # Gate 1: City-level location overlap (extract "City" from "City - Area")
    locs_a = list(a.locations or [])
    locs_b = list(b.locations or [])
    cities_a = {_city(l) for l in locs_a}
    cities_b = {_city(l) for l in locs_b}
    if not cities_a or not cities_b or not (cities_a & cities_b):
        return {"score": 0, "breakdown": {"disqualified": "no_city_overlap",
                "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # Gate 2: Budget adjacency — supports multi-range (any overlap = pass)
    ranges_a = list(a.budget_ranges or ([a.budget_range.value] if a.budget_range else []))
    ranges_b = list(b.budget_ranges or ([b.budget_range.value] if b.budget_range else []))
    if ranges_a and ranges_b:
        adjacent = any(rb in BUDGET_ADJACENCY.get(ra, set()) for ra in ranges_a for rb in ranges_b)
        if not adjacent:
            return {"score": 0, "breakdown": {"disqualified": "budget_mismatch",
                    "hard_constraints": 0, "dealbreakers": 0, "lifestyle": 0}}

    # (Timeline and occupancy are now soft-scored, not hard gates)

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

    # Location area depth (10 pts) — bonus for matching exact areas, not just city
    # "City - Others" counts as overlapping with any area in the same city on the other side
    set_a, set_b = set(locs_a), set(locs_b)
    def _expand_others(src, other):
        expanded = set(src)
        for loc in src:
            if loc.endswith(' - Others'):
                city = loc.rsplit(' - ', 1)[0]
                for o in other:
                    if _city(o) == city:
                        expanded.add(o)
        return expanded
    exp_a = _expand_others(set_a, set_b)
    exp_b = _expand_others(set_b, set_a)
    area_jaccard = _jaccard(list(exp_a), list(exp_b))
    location_pts = round(area_jaccard * 10, 2)

    # Budget quality (10 pts) — exact overlap scores more than adjacent only
    exact_overlap = any(ra == rb for ra in ranges_a for rb in ranges_b)
    budget_pts = 10 if exact_overlap else 5

    # Move-in timeline soft score (5 pts) — supports multi-select
    tls_a = list(a.move_in_timelines or ([a.move_in_timeline.value] if a.move_in_timeline else []))
    tls_b = list(b.move_in_timelines or ([b.move_in_timeline.value] if b.move_in_timeline else []))
    if not tls_a or not tls_b:
        timeline_pts = 3.0  # one not set = neutral
    elif any(tb in TIMELINE_ADJACENCY.get(ta, set()) for ta in tls_a for tb in tls_b):
        # Check if any pair is an exact match
        timeline_pts = 5.0 if any(ta == tb for ta in tls_a for tb in tls_b) else 3.0
    else:
        timeline_pts = 0.0  # no adjacent pair found

    # Occupancy type soft score (5 pts) — supports multi-select
    ots_a = list(a.occupancy_types or ([a.occupancy_type.value] if a.occupancy_type else []))
    ots_b = list(b.occupancy_types or ([b.occupancy_type.value] if b.occupancy_type else []))
    if not ots_a or not ots_b:
        occupancy_pts = 3.0  # one not set = neutral
    elif any(oa == ob for oa in ots_a for ob in ots_b):
        occupancy_pts = 5.0  # at least one matching option
    else:
        occupancy_pts = 0.0  # no overlap (only-private vs only-twin-sharing)

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

    # Lifestyle similarity (50 pts)
    social_pts = round(_jaccard(a.social_battery, b.social_battery) * 20, 2)
    habits_pts = round(_jaccard(a.habits,         b.habits)         * 20, 2)
    work_pts   = round(_jaccard(a.work_study,     b.work_study)     * 10, 2)
    lifestyle_pts = round(social_pts + habits_pts + work_pts, 2)

    # Total: location(10) + budget(10) + timeline(5) + occupancy(5) + dealbreakers(20) + lifestyle(50) = 100
    total = round(min(location_pts + budget_pts + timeline_pts + occupancy_pts + dealbreaker_pts + lifestyle_pts, 100), 2)

    return {
        "score": total,
        "breakdown": {
            "hard_constraints": round(location_pts + budget_pts + timeline_pts + occupancy_pts, 2),
            "dealbreakers":     dealbreaker_pts,
            "lifestyle":        lifestyle_pts,
        }
    }
