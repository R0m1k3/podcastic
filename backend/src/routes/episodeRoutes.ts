import { Router } from 'express';
import {
  getLatestEpisodes,
  getPodcastEpisodes,
  getEpisode,
  saveProgress,
  getProgress,
} from '../controllers/episodeController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes
router.get('/latest', authenticate, getLatestEpisodes);
router.post('/progress', authenticate, saveProgress);
router.get('/progress/:episodeId', authenticate, getProgress);

// Public routes
router.get('/:episodeId', getEpisode);
router.get('/podcast/:podcastId', getPodcastEpisodes);

export default router;
