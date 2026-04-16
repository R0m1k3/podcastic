import cron from 'node-cron';
import { Podcast } from '../models/Podcast';
import { rssParserService } from './rssParserService';

/**
 * Service to handle background synchronization of podcast feeds
 */
export const syncService = {
  /**
   * Initialize background sync jobs
   */
  startBackgroundSync: () => {
    console.log('✓ Background Sync Engine started');

    // Run every 4 hours
    // '0 */4 * * *'
    cron.schedule('0 */4 * * *', async () => {
      console.log(`[Cron] Starting global library sync: ${new Date().toISOString()}`);
      await syncService.syncAllPodcasts();
    });

    // Run a quick sync for "Zero Episode" podcasts every hour
    // (Helpful for new additions that failed initial sync)
    cron.schedule('0 * * * *', async () => {
        await syncService.syncEmptyPodcasts();
    });
  },

  /**
   * Sync all podcasts in the database
   */
  syncAllPodcasts: async () => {
    try {
      const podcasts = await Podcast.find({});
      console.log(`[Sync Engine] Processing ${podcasts.length} podcasts...`);

      for (const podcast of podcasts) {
        try {
          await rssParserService.syncPodcastEpisodes(podcast._id.toString(), podcast.rssUrl);
          // Wait 5 seconds between podcasts to avoid rate limiting from sources
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error: any) {
          console.error(`[Sync Engine] Failed to sync ${podcast.title}:`, error.message);
        }
      }

      console.log('[Sync Engine] Global sync completed');
    } catch (error: any) {
      console.error('[Sync Engine] Master sync error:', error.message);
    }
  },

  /**
   * Specifically target podcasts with 0 episodes
   */
  syncEmptyPodcasts: async () => {
      try {
          const emptyPodcasts = await Podcast.find({ episodeCount: 0 });
          if (emptyPodcasts.length === 0) return;

          console.log(`[Sync Engine] Retrying ${emptyPodcasts.length} empty podcasts...`);
          for (const podcast of emptyPodcasts) {
              await rssParserService.syncPodcastEpisodes(podcast._id.toString(), podcast.rssUrl, true);
          }
      } catch (error: any) {
          console.error('[Sync Engine] Empty podcasts sync error:', error.message);
      }
  }
};
