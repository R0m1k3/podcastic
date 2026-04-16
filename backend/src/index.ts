import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { connectDB } from './config/database';
import { initRedis, closeRedis } from './config/redis';
import { authenticate, optional } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

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

// API Routes - TODO: Import and register routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// 404 handler
app.use(notFoundHandler);

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
