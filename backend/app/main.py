from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base, settings
from app.routes import survey, users, matching, groups, auth, admin, swipes, chat, kit, communication
from app.routes import broker_auth, broker_listings, broker_inquiries, listings, inquiries
from app.models import LifestyleTag, LifestyleCategory

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Add new columns to existing tables if they don't exist yet
def run_migrations():
    from sqlalchemy import text
    # ALTER TYPE ADD VALUE must run outside a transaction (AUTOCOMMIT) in PostgreSQL
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("ALTER TYPE smokingpreference ADD VALUE IF NOT EXISTS 'smoker-prefer-smoker'"))
        conn.execute(text("ALTER TYPE smokingpreference ADD VALUE IF NOT EXISTS 'indifferent'"))

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
        # Email communication system
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_unsubscribed BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(64)"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_logs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                email_type VARCHAR(50) NOT NULL,
                subject VARCHAR(255),
                sent_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_email_logs_user ON email_logs (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_email_logs_type ON email_logs (email_type, sent_at)"))
        # Duration of stay
        conn.execute(text("ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS stay_duration VARCHAR(20)"))

        # Broker listings
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brokerstatus') THEN
                    CREATE TYPE brokerstatus AS ENUM ('pending', 'approved', 'suspended');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listingstatus') THEN
                    CREATE TYPE listingstatus AS ENUM ('draft', 'pending_review', 'live', 'paused', 'archived');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'propertytype') THEN
                    CREATE TYPE propertytype AS ENUM ('pg', 'flat', 'room_in_flat');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'furnishingtype') THEN
                    CREATE TYPE furnishingtype AS ENUM ('fully_furnished', 'semi_furnished', 'unfurnished');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquirystatus') THEN
                    CREATE TYPE inquirystatus AS ENUM ('open', 'closed');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquirymessagesender') THEN
                    CREATE TYPE inquirymessagesender AS ENUM ('user', 'broker');
                END IF;
            END$$;
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS brokers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                city VARCHAR(100),
                status brokerstatus NOT NULL DEFAULT 'pending',
                admin_note VARCHAR(500),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(3000),
                property_type propertytype NOT NULL,
                furnishing furnishingtype,
                city VARCHAR(100) NOT NULL,
                locality VARCHAR(255) NOT NULL,
                full_address VARCHAR(500),
                monthly_rent INTEGER NOT NULL,
                deposit INTEGER,
                maintenance INTEGER,
                total_beds INTEGER,
                available_beds INTEGER,
                gender_preference genderpreference,
                amenities JSONB,
                rules JSONB,
                photos JSONB,
                status listingstatus NOT NULL DEFAULT 'draft',
                admin_note VARCHAR(500),
                available_from DATE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS listing_inquiries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status inquirystatus NOT NULL DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (listing_id, user_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS inquiry_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                inquiry_id UUID NOT NULL REFERENCES listing_inquiries(id) ON DELETE CASCADE,
                sender_role inquirymessagesender NOT NULL,
                sender_id UUID NOT NULL,
                content VARCHAR(3000) NOT NULL,
                flagged BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listings_city ON listings (city)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_listing_inquiries_user ON listing_inquiries (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry ON inquiry_messages (inquiry_id)"))
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
    allow_origins=[
        "https://colocsy.com",
        "https://www.colocsy.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
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
app.include_router(communication.router)
app.include_router(broker_auth.router)
app.include_router(broker_listings.router)
app.include_router(broker_inquiries.router)
app.include_router(listings.router)
app.include_router(inquiries.router)

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
