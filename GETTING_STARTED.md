# 🚀 Getting Started with Podcastic

Complete guide to set up and run the Podcastic application locally or with Docker.

## Prerequisites

### For Docker (Recommended)
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum

### For Local Development
- Node.js 20+ (LTS)
- npm or yarn
- MongoDB 5.0+ (local or MongoDB Atlas)
- Redis 6.0+ (local or Redis Cloud)

## 🐳 Option 1: Run with Docker Compose (Easiest)

### Step 1: Prepare Environment
```bash
cd Podcastic
cp .env.example .env
```

### Step 2: Start All Services
```bash
docker-compose up -d
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### Step 3: Access the Application
1. Open http://localhost:3000 in your browser
2. Click "Create Account" to register a new user
3. Log in with your credentials

### Common Docker Commands
```bash
# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove volumes (warning: deletes data!)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

## 💻 Option 2: Local Development

### Prerequisites Setup

#### MongoDB
```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Or use MongoDB Atlas (cloud)
# Sign up at: https://www.mongodb.com/cloud/atlas
```

#### Redis
```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Or use Redis Cloud
# https://redis.com/try-free/
```

### Step 1: Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/podcastic
REDIS_URL=redis://localhost:6379
```

### Step 2: Install Dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

### Step 3: Run Development Servers

#### Windows (Batch Script)
```bash
# From project root
dev.bat
```

#### macOS/Linux (Shell Script)
```bash
# From project root
chmod +x dev.sh
./dev.sh
```

#### Manual (Split Terminals)
Terminal 1 - Backend:
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
# Server runs on http://localhost:3000
```

### Step 4: Access the Application
Open http://localhost:3000 in your browser

## 🧪 Testing the API

### Using cURL

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Get User (Requires Token)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman
1. Import the API requests from the application
2. Set Bearer tokens in the Authorization tab
3. Test endpoints

## 📱 Testing Responsive Design

### Chrome DevTools
1. Press F12 to open DevTools
2. Click the device toggle icon (top-left)
3. Select different devices to test

### Responsive Breakpoints
- **Mobile**: 320px - 480px
- **Tablet**: 481px - 1024px
- **Desktop**: 1025px+

## 🔧 Configuration Options

### Environment Variables

#### Backend (.env)
```env
# Server
NODE_ENV=development|production
PORT=5000

# Database
MONGODB_URI=mongodb://user:pass@host/db
MONGODB_USER=username
MONGODB_PASSWORD=password

# Cache
REDIS_URL=redis://host:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# External APIs (Optional)
PODCAST_INDEX_API_KEY=your_key
PODCAST_INDEX_API_SECRET=your_secret
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 📚 Development Workflow

### Code Structure
```
Podcastic/
├── frontend/src/
│   ├── pages/          # Route pages
│   ├── components/     # Reusable components
│   ├── hooks/          # Custom hooks
│   ├── services/       # API services
│   └── styles/         # Global styles
└── backend/src/
    ├── routes/         # API routes
    ├── controllers/    # Business logic
    ├── models/         # MongoDB schemas
    ├── middleware/     # Express middleware
    └── services/       # Service layer
```

### Making Code Changes

**Backend Changes**:
1. Edit files in `backend/src/`
2. TypeScript auto-compiles (with `npm run dev`)
3. Server hot-reloads automatically
4. Check terminal for errors

**Frontend Changes**:
1. Edit files in `frontend/src/`
2. Vite hot-reloads in browser automatically
3. Check browser console for errors

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find what's using port 3000
lsof -i :3000
# or
netstat -ano | findstr :3000

# Kill the process (on Windows)
taskkill /PID <PID> /F
```

### MongoDB Connection Error
- Ensure MongoDB is running: `brew services list`
- Check connection string in `.env`
- Verify credentials if using Atlas

### Redis Connection Error
- Ensure Redis is running: `brew services list`
- Check Redis URL in `.env`
- Test with: `redis-cli ping` (should return "PONG")

### API 404 Errors
- Verify backend is running on port 5000
- Check frontend proxy configuration in `vite.config.ts`
- Review VITE_API_URL environment variable

### Slow Performance
- Check browser DevTools Network tab
- Use RTK commands for optimized output: `rtk npm run dev`
- Clear browser cache (Ctrl+Shift+Del)
- Check system RAM usage

## 📦 Building for Production

### Docker Build
```bash
docker-compose build --no-cache

# Push to registry
docker tag podcastic-backend myregistry/podcastic-backend:latest
docker push myregistry/podcastic-backend:latest
```

### Manual Build
```bash
# Backend
cd backend
npm ci --only=production
npm run build

# Frontend
cd frontend
npm ci --only=production
npm run build
```

## 🚀 Deployment

### Using Docker
See `.env.example` for production variables:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment
- **Heroku**: See `Procfile` (if present)
- **AWS**: Use ECR + ECS
- **DigitalOcean**: Use App Platform
- **Render**: Connect GitHub repo

## 📖 Additional Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Docs](https://docs.mongodb.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Docker Documentation](https://docs.docker.com)

## ❓ FAQ

**Q: Can I use SQLite instead of MongoDB?**
A: Not currently, but can be added. Requires schema changes.

**Q: How do I add more podcasts?**
A: Currently via manual RSS URL addition. PodcastIndex API search coming soon.

**Q: Can I deploy to Vercel/Netlify?**
A: Frontend yes (static), backend no (needs server runtime).

**Q: How is the audio streamed?**
A: Direct HTTP range requests - no downloads to disk.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Push and create PR

## 📝 License

MIT - See LICENSE file

---

**Need help?** Check existing GitHub issues or create a new one.

**Last updated**: 2026-04-16
