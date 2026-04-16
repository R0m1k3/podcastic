#!/bin/bash

# Podcastic Development Helper Script

echo "🎙️  Podcastic Development Server Launcher"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✓ .env created. Please update with your configuration."
    echo ""
fi

# Check for MongoDB connection
echo "📡 Checking MongoDB connection..."
MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/podcastic"}

if [ "$MONGODB_URI" = "mongodb://localhost:27017/podcastic" ]; then
    echo "⚠️  Using local MongoDB at $MONGODB_URI"
    echo "   Make sure MongoDB is running!"
    echo ""
fi

# Check for Redis connection
echo "🔴 Checking Redis connection..."
REDIS_URL=${REDIS_URL:-"redis://localhost:6379"}

if [ "$REDIS_URL" = "redis://localhost:6379" ]; then
    echo "⚠️  Using local Redis at $REDIS_URL"
    echo "   Make sure Redis is running!"
    echo ""
fi

# Start both servers
echo "🚀 Starting both servers..."
echo ""

# Start backend in background
echo "→ Backend starting on port 5000..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

sleep 2

# Start frontend in background
echo "→ Frontend starting on port 3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✓ Servers started!"
echo ""
echo "📍 Frontend:  http://localhost:3000"
echo "📍 Backend:   http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all servers..."
echo ""

# Wait for background processes
wait $BACKEND_PID
wait $FRONTEND_PID
