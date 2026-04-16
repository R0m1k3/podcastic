import { Router } from 'express';
import {
  getUserSubscriptions,
  subscribe,
  unsubscribe,
  syncPodcast,
  searchPodcasts,
  getPodcast,
  discoverPodcasts,
  subscribeFromDiscovery,
  getTrendingPodcasts,
} from '../controllers/podcastController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes
router.get('/subscriptions', authenticate, getUserSubscriptions);
router.post('/subscribe', authenticate, subscribe);
router.post('/subscribe-discovery', authenticate, subscribeFromDiscovery);
router.delete('/:podcastId/unsubscribe', authenticate, unsubscribe);
router.post('/:podcastId/sync', authenticate, syncPodcast);

// Public/discovery routes
router.get('/discover', discoverPodcasts);
router.get('/trending', getTrendingPodcasts);
router.get('/search', searchPodcasts);
router.get('/:podcastId', getPodcast);

export default router;
