from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base, settings
from app.routes import survey, users, matching, groups, auth, admin, swipes, chat, kit
from app.models import LifestyleTag, LifestyleCategory

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Add new columns to existing tables if they don't exist yet
def run_migrations():
    from sqlalchemy import text
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE"))
        conn.execute(text("ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS budget_ranges JSONB"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)"))
        conn.execute(text("ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(20)"))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'usergender') THEN
                    CREATE TYPE usergender AS ENUM ('male', 'female', 'other');
                END IF;
            END$$;
        """))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender usergender"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE"))
        # New smoking preference enum values
        conn.execute(text("ALTER TYPE smokingpreference ADD VALUE IF NOT EXISTS 'smoker-prefer-smoker'"))
        conn.execute(text("ALTER TYPE smokingpreference ADD VALUE IF NOT EXISTS 'indifferent'"))
        # Multi-select timeline and occupancy
        conn.execute(text("ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS move_in_timelines JSONB"))
        conn.execute(text("ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS occupancy_types JSONB"))
        # Group invitations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS group_invitations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (group_id, invitee_id)
            )
        """))
        # Indexes for high-frequency queries
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_swipes_swiper ON user_swipes (swiper_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_user_swipes_target ON user_swipes (target_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mutual_matches_a ON mutual_matches (user_a_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_mutual_matches_b ON mutual_matches (user_b_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_messages_group ON messages (group_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_match_scores_pair ON match_scores (user_a_id, user_b_id)"))
        conn.commit()

run_migrations()

# Seed lifestyle tags if not already present
def seed_lifestyle_tags():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        existing_tags = db.query(LifestyleTag).count()
        if existing_tags == 0:
            tags_data = [
                # Social Battery
                LifestyleTag(
                    category=LifestyleCategory.SOCIAL_BATTERY,
                    tag_key="extrovert",
                    tag_label="I love hosting weekend dinners."
                ),
                LifestyleTag(
                    category=LifestyleCategory.SOCIAL_BATTERY,
                    tag_key="ghost",
                    tag_label="I mostly keep to my room; you won't even know I'm there."
                ),
                LifestyleTag(
                    category=LifestyleCategory.SOCIAL_BATTERY,
                    tag_key="social_butterfly",
                    tag_label="Looking for a roommate who becomes a best friend."
                ),
                # Habits & Cleanliness
                LifestyleTag(
                    category=LifestyleCategory.HABITS,
                    tag_key="clean_freak",
                    tag_label="I need the kitchen counters sparkling at all times."
                ),
                LifestyleTag(
                    category=LifestyleCategory.HABITS,
                    tag_key="chill_messy",
                    tag_label="A little clutter doesn't bother me."
                ),
                LifestyleTag(
                    category=LifestyleCategory.HABITS,
                    tag_key="chef",
                    tag_label="I cook 3 meals a day (and I'm happy to share)."
                ),
                LifestyleTag(
                    category=LifestyleCategory.HABITS,
                    tag_key="early_bird",
                    tag_label="I'm up at 6 AM."
                ),
                LifestyleTag(
                    category=LifestyleCategory.HABITS,
                    tag_key="night_owl",
                    tag_label="My day starts at noon."
                ),
                # Work/Study Life
                LifestyleTag(
                    category=LifestyleCategory.WORK_STUDY,
                    tag_key="wfh_warrior",
                    tag_label="I need a quiet environment during 9-5."
                ),
                LifestyleTag(
                    category=LifestyleCategory.WORK_STUDY,
                    tag_key="office_goer",
                    tag_label="I'm only home to sleep and shower."
                ),
                LifestyleTag(
                    category=LifestyleCategory.WORK_STUDY,
                    tag_key="library_resident",
                    tag_label="I'm a student; silence is golden."
                ),
            ]
            db.add_all(tags_data)
            db.commit()
            print("✓ Lifestyle tags seeded successfully")
    except Exception as e:
        db.rollback()
        print(f"Error seeding tags: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting NObroker Phase 1 API...")
    seed_lifestyle_tags()
    yield
    # Shutdown
    print("🛑 Shutting down NObroker API...")

# Initialize FastAPI app
app = FastAPI(
    title="NObroker Phase 1 API",
    description="Roommate matching platform - The Matchmaker module",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(survey.router)
app.include_router(users.router)
app.include_router(matching.router)
app.include_router(groups.router)
app.include_router(admin.router)
app.include_router(swipes.router)
app.include_router(chat.router)
app.include_router(kit.router)

# Health check
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NObroker Phase 1 API",
        "version": "0.1.0"
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to NObroker Phase 1 - The Matchmaker",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
