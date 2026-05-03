import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database';
import { initRedis, closeRedis } from './config/redis';
import { syncService } from './services/syncService';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import podcastRoutes from './routes/podcastRoutes';
import episodeRoutes from './routes/episodeRoutes';
import audioRoutes from './routes/audioRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for simplicity in this development phase
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { message: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const discoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // lower limit for heavy RSS operations
  message: { message: 'Limite de recherche atteinte pour cette heure.' },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize databases on startup
let isInitialized = false;

const initialize = async () => {
  if (isInitialized) return;

  try {
    await connectDB();
    await initRedis();
    isInitialized = true;
    console.log('✓ All services initialized');
  } catch (error) {
    console.error('✗ Initialization failed:', error);
    process.exit(1);
  }
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/podcasts', apiLimiter, podcastRoutes);
app.use('/api/episodes', apiLimiter, episodeRoutes);
app.use('/api/audio', audioRoutes);

// Serve frontend static files in production
const frontendDist = path.join(__dirname, '..', 'public');
app.use(express.static(frontendDist));

// SPA fallback — return index.html for any non-API route
app.get('*', (req, res) => {
  const indexFile = path.join(frontendDist, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      res.status(404).json({ success: false, message: 'Not found' });
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    await initialize();
    syncService.startBackgroundSync();

    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🎙️  Podcastic Backend`);
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${'='.repeat(50)}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
