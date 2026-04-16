import { Router } from 'express';
import {
  getUserSubscriptions,
  subscribe,
  unsubscribe,
  searchPodcasts,
  getPodcast,
} from '../controllers/podcastController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes
router.get('/subscriptions', authenticate, getUserSubscriptions);
router.post('/subscribe', authenticate, subscribe);
router.delete('/:podcastId/unsubscribe', authenticate, unsubscribe);

// Public routes
router.get('/search', searchPodcasts);
router.get('/:podcastId', getPodcast);

export default router;
