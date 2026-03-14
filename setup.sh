#!/bin/bash

# NObroker Phase 1 Quick Start

echo "🚀 Starting NObroker Phase 1 Setup..."

# Backend setup
echo ""
echo "📦 Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

echo ""
echo "✅ Backend setup complete!"
echo "To start backend: cd backend && uvicorn app.main:app --reload"

# Frontend setup
echo ""
echo "📦 Setting up Frontend..."
cd ../frontend
npm install

echo ""
echo "✅ Frontend setup complete!"
echo "To start frontend: cd frontend && npm run dev"

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running"
echo "2. Update backend/.env with your database credentials"
echo "3. Terminal 1: cd backend && uvicorn app.main:app --reload"
echo "4. Terminal 2: cd frontend && npm run dev"
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "API Documentation: http://localhost:8000/docs"
