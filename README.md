# NObroker Phase 1 - The Matchmaker

A Tinder-like roommate-matching platform where users fill out personality-based surveys to find compatible roommates.

## Project Structure

```
NObroker.v1/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── models.py            # Database models
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── schemas.py           # Pydantic schemas
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── survey.py        # Survey endpoints
│   │       └── users.py         # User endpoints
│   ├── requirements.txt
│   ├── .env
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api.js               # API service
│   │   ├── pages/
│   │   │   └── Dashboard.jsx    # Main survey page
│   │   ├── components/
│   │   │   ├── SurveyCard.jsx           # Mandatory questions
│   │   │   ├── LifestyleSwiperCard.jsx  # Lifestyle tags (swipe)
│   │   │   ├── DealbreakersSection.jsx  # Dealbreaker badges
│   │   │   ├── DeepDivePrompts.jsx      # Open-ended questions
│   │   │   └── SurveyPreview.jsx        # Profile preview
│   │   └── hooks/
│   │       └── useSurvey.js     # State management with Zustand
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── .env.local
│   └── README.md
├── .gitignore
└── README.md
```

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend**: React, Vite, Zustand (state management), Axios
- **Database**: PostgreSQL
- **API**: RESTful with CORS

## Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+

### Backend Setup

1. **Install Python dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up database** (Update `.env` with your PostgreSQL credentials)
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/nobroker_db
   ```

3. **Run database migrations** (auto-created on startup)
   ```bash
   python -m app.main
   ```

4. **Start FastAPI server**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
   Server runs at: `http://localhost:8000`
   API Docs: `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```
   App runs at: `http://localhost:3000`

3. **Build for production**
   ```bash
   npm run build
   ```

## API Endpoints

### Users
- `POST /api/users` - Create a new user
- `GET /api/users/{user_id}` - Get user details
- `GET /api/users/{user_id}/profile` - Get full profile with survey

### Survey
- `GET /api/survey/questions` - Get all survey questions
- `POST /api/survey/start` - Start a new survey
- `POST /api/survey/{survey_id}/mandatory` - Save hard constraints
- `POST /api/survey/{survey_id}/lifestyle` - Save lifestyle tags
- `POST /api/survey/{survey_id}/dealbreakers` - Save dealbreaker badges
- `POST /api/survey/{survey_id}/deep-dive` - Save open-ended responses
- `GET /api/survey/{survey_id}/preview` - Get survey preview
- `GET /api/survey/{survey_id}/status` - Get completion status
- `POST /api/survey/{survey_id}/submit` - Submit survey

## Survey Flow

1. **Must-Haves** (Mandatory)
   - Budget range: ₹10k - ₹1L+
   - Location hubs: HSR, BKC, Gachibowli, etc.
   - Move-in timeline: ASAP, 1-month, 2-3 months
   - Room type: Private or twin-sharing

2. **Lifestyle Swipe** (Personality)
   - Social Battery: Extrovert, Ghost, Social Butterfly
   - Habits: Clean Freak, Chill, Chef, Early Bird, Night Owl
   - Work/Study: WFH Warrior, Office Goer, Library Resident

3. **Dealbreakers** (Quick Selection)
   - 🐾 Pets: Have, Love, No
   - 🚬 Smoking: Smoker, Non-smoker, Outside only
   - 🥦 Dietary: Veg, Non-veg
   - 🚻 Gender: Male, Female, Neutral

4. **Deep Dive** (Optional, Storytelling)
   - "My ideal Sunday in the apartment looks like..."
   - "The one house rule I won't compromise on is..."
   - "In a roommate, I value [X] more than anything else."
   - "My 'toxic' roommate trait is..."

5. **Preview & Submit**
   - Review complete profile
   - Submit to find matches

## State Management

Using **Zustand** for lightweight state management:
- `useSurvey` hook manages survey data, current step, and local storage sync
- Auto-saves drafts to localStorage
- Tracks completion percentage

## Features

✅ Multi-step form with Tinder-like UX
✅ Swipe-based lifestyle tag selection
✅ Modal-based dealbreaker selection
✅ Auto-save to localStorage (draft functionality)
✅ Real-time progress tracking
✅ Profile preview before submission
✅ API integration with FastAPI backend
✅ Responsive design

## Future Phases

**Phase 2 - Co-Search**:
- Group formation (2+ users matching)
- Collaborative wishlist for properties
- Interactive voting on listings
- Commute optimizer

**Phase 3 - Transaction**:
- Split calculator for rent
- Document vault for verification
- Secure group profile sharing

## Development

### Run Backend Tests
```bash
cd backend
pytest
```

### Format Code
```bash
# Frontend
npm run lint

# Backend
black app/
```

## Troubleshooting

**PostgreSQL Connection Error**:
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`

**CORS Issues**:
- Backend CORS is configured for all origins (`*`) in development
- Change in production to specific origins

**Frontend API Errors**:
- Ensure backend is running on `http://localhost:8000`
- Check browser DevTools Network tab

## Contributing

1. Branch naming: `feature/name` or `bugfix/name`
2. Commit messages: Clear, descriptive
3. Pull requests: Include screenshots/demo links

## License

NObroker © 2025
