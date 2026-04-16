# 🎙️ Podcastic

A modern, ultra-responsive multi-user podcast streaming application with an Apple TV-inspired design.

## ✨ Features

- **Podcast Discovery & Management**: Search, subscribe, and organize your favorite podcasts
- **Stream Playback**: Direct audio streaming without disk usage
- **Dashboard**: View latest episodes from all subscriptions
- **User Accounts**: Multi-user with JWT authentication
- **Responsive Design**: Mobile-first, works perfectly on all devices
- **Ultra-Fast**: Optimized with Redis caching and efficient database queries
- **Docker Ready**: Containerized for easy deployment

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (ultra-fast bundler)
- Tailwind CSS (styling with Apple TV aesthetic)
- React Router (navigation)
- TanStack Query (server state management)

### Backend
- Node.js + Express.js
- MongoDB (flexible data storage)
- Redis (caching & performance)
- JWT (authentication)
- TypeScript

### DevOps
- Docker & Docker Compose
- Alpine images for minimal size

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Node.js 20+ (for local development)
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Using Docker Compose (Recommended)

```bash
# Clone and enter directory
cd Podcastic

# Create .env file from template
cp .env.example .env

# Start all services
docker-compose up -d

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
# Redis: localhost:6379
```

### Local Development

#### Backend
```bash
cd backend
npm install
npm run dev  # Starts on port 5000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev  # Starts on port 3000
```

## 📁 Project Structure

```
Podcastic/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── styles/
│   └── Dockerfile
│
├── backend/           # Express.js API
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── config/
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔑 Key Models

### User
- Email, password, username, avatar
- Preferences (playback speed, theme, language)

### Podcast
- Title, description, RSS URL, image
- Author, categories, language
- Episode count, last fetched timestamp

### Episode
- Title, description, audio URL
- Publication date, duration
- Unique GUID per podcast

### UserProgress
- Current position in episode (seconds)
- Completion status
- Saved episodes
- Listen history

## 📡 API Endpoints (To be implemented)

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Podcasts
- `GET /api/podcasts` - Get user subscriptions
- `POST /api/podcasts/subscribe` - Add subscription
- `DELETE /api/podcasts/:id/unsubscribe` - Remove subscription
- `GET /api/podcasts/search` - Search podcasts

### Episodes
- `GET /api/episodes/latest` - Latest episodes dashboard
- `GET /api/episodes/:id` - Get episode details
- `GET /api/podcasts/:id/episodes` - Podcast episodes

### Progress
- `POST /api/progress` - Save listening position
- `GET /api/progress/:episodeId` - Get saved position

## 🎨 Design System

### Apple TV Style
- Light theme with subtle gradients
- Glassmorphism effects (backdrop blur)
- Rounded corners (lg/xl)
- Soft shadows for depth
- Generous spacing

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: 1024px+

## 🔒 Security

- JWT tokens for stateless authentication
- Bcrypt password hashing
- CORS configured
- Input validation with Zod
- Environment variables for secrets

## 📊 Performance Targets

- Dashboard load: < 1s (on 4G)
- Stream start: < 2s
- Docker image: < 100MB total
- Startup time: < 5s

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Rebuild images
docker-compose build --no-cache

# Remove volumes (careful!)
docker-compose down -v
```

## 🧪 Testing

Coming soon...

## 📝 Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Test thoroughly
4. Commit: `git commit -m "feat: add my feature"`
5. Push: `git push origin feature/my-feature`

## 🔄 Environment Variables

See `.env.example` for all available options. Key ones:

- `NODE_ENV` - development/production
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection URL
- `JWT_SECRET` - Secret for signing tokens
- `PODCAST_INDEX_API_KEY` - API key for podcast search (optional)

## 📚 Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com)
- [MongoDB Docs](https://docs.mongodb.com)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 📄 License

MIT

## 👨‍💻 Author

Built with ❤️

---

**Status**: Under development - Phase 1 (Foundation) in progress
