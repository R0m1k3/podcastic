import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('✗ Redis max retries reached');
            return new Error('Max retries');
          }
          return retries * 50;
        },
      },
    });

    redisClient.on('error', (err) => console.error('Redis error:', err));
    redisClient.on('connect', () => console.log('✓ Redis connected'));
    redisClient.on('reconnecting', () => console.log('→ Redis reconnecting...'));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('✗ Redis connection failed:', error);
    process.exit(1);
  }
};

export const getRedis = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('✓ Redis connection closed');
  }
};
