# 🔍 Podcast Index Integration Setup

This guide explains how to set up Podcast Index API for podcast discovery and search functionality in Podcastic.

## What is Podcast Index?

[Podcast Index](https://podcastindex.org/) is a free, independent podcast database and API that provides:
- Podcast search functionality
- Trending podcasts
- Podcast metadata (title, author, image, description)
- Episode information
- No ads, no corporate tracking

## Prerequisites

- Podcastic backend running
- Internet connection
- Free Podcast Index account

## Step 1: Get API Keys

### Register on Podcast Index
1. Visit [Podcast Index API](https://podcastindex-api.com/)
2. Click "Sign Up" (top right)
3. Create a free account with your email
4. Check your email for verification link
5. Confirm your email address

### Generate API Keys
1. Log in to your Podcast Index account
2. Go to "My API Keys" section
3. You'll see:
   - **API Key** (e.g., `abcdef123456`)
   - **API Secret** (e.g., `xyz789`)
4. Copy both values

## Step 2: Configure Environment Variables

### Update `.env` file
```bash
# In the root Podcastic directory
nano .env  # or edit with your preferred editor
```

Add these lines:
```env
PODCAST_INDEX_API_KEY=your_api_key_here
PODCAST_INDEX_API_SECRET=your_api_secret_here
```

**Example:**
```env
PODCAST_INDEX_API_KEY=abcdef123456
PODCAST_INDEX_API_SECRET=xyz789opqrst
```

### Docker Setup
If using Docker, the environment variables will be automatically loaded from `.env`:

```bash
docker-compose up -d
```

The backend will automatically detect and use your API keys.

## Step 3: Verify Setup

### Test API Integration
```bash
# Start the backend (if not running)
cd backend
npm run dev

# In another terminal, test the API
curl http://localhost:5000/api/podcasts/discover?q=technology
```

Expected response:
```json
{
  "source": "podcastindex",
  "podcasts": [
    {
      "id": "25566",
      "title": "Example Podcast",
      "rssUrl": "https://example.com/feed",
      "author": "Podcast Author",
      "description": "...",
      "imageUrl": "...",
      "episodeCount": 150
    }
  ],
  "count": 10
}
```

### Test in Frontend
1. Open http://localhost:3000/discover
2. Click on the "🔍 Search Results" tab
3. Type a podcast name (e.g., "technology", "news", "music")
4. Results should appear from Podcast Index

## Features Enabled by API

### ✅ Podcast Discovery
- Search by keyword
- Browse trending podcasts
- View podcast metadata

### ✅ Quick Subscribe
- Find podcasts directly from discover page
- One-click subscribe
- Auto-fetch episodes

### Example Searches
- **Popular podcasts**: "Joe Rogan", "NPR", "BBC"
- **Topics**: "technology", "news", "business", "science"
- **Specific shows**: "The Daily", "Serial", "Freakonomics"

## API Limits

### Free Tier (Default)
- **100 requests per minute** per API key
- Sufficient for small to medium users
- No additional signup needed

### If You Need More
- Podcast Index offers higher rate limits for supporters
- See their pricing page for details

## Fallback When API is Unavailable

If PodcastIndex API is not configured or unavailable:
- Users can still subscribe manually using RSS URLs
- Dashboard shows previously subscribed podcasts
- Graceful degradation - app still works

## Troubleshooting

### "API credentials not configured"
**Solution**: Check that both `PODCAST_INDEX_API_KEY` and `PODCAST_INDEX_API_SECRET` are set in `.env`

```bash
# Verify environment variables
echo $PODCAST_INDEX_API_KEY
echo $PODCAST_INDEX_API_SECRET
```

### "Search rate limited"
**Error**: `Search rate limited. Please try again later.`

**Solution**:
- Wait a minute before searching again
- Rate limit resets every 60 seconds
- This is normal with free tier - switch searches if needed

### "Authentication failed"
**Error**: `PodcastIndex API authentication failed`

**Solution**:
- Verify your API keys are correct
- Check for extra spaces/newlines in `.env`
- Regenerate API keys on Podcast Index website if needed

### No results appear
**Possible causes**:
- API key not configured
- Internet connection issue
- Podcast doesn't exist in Podcast Index database

**Solution**:
- Try a very common podcast name first (e.g., "NPR")
- Check your internet connection
- Fall back to subscribing via RSS URL if needed

## Security Notes

⚠️ **Important**
- Never commit `.env` to git (it's in `.gitignore`)
- Don't share your API secret publicly
- API keys are for your use only
- Regenerate keys if accidentally exposed

## Using RSS URLs as Alternative

If you don't want to use Podcast Index:

1. Find podcast RSS URL:
   - On the podcast's website
   - Search "[Podcast Name] RSS" in Google
   - Common format: `example.com/feed` or `example.com/podcast/rss`

2. Subscribe directly:
   - Go to Dashboard
   - Click Subscribe (or future manual add feature)
   - Paste RSS URL
   - Podcastic fetches episodes automatically

## API Documentation

Full API reference: [Podcast Index Documentation](https://podcastindex-api.com/docs/index.html)

Key endpoints available in Podcastic:
- `GET /api/podcasts/discover` - Search podcasts
- `GET /api/podcasts/trending` - Get trending podcasts
- `POST /api/podcasts/subscribe-discovery` - Subscribe from search results

## Advanced: Custom Podcast Sources

To use a different podcast database:
1. Implement a new service in `backend/src/services/`
2. Add environment variables for API credentials
3. Update `podcastController.ts` to use the new service
4. No frontend changes needed!

Example: Could integrate Apple Podcasts API, Spotify API, or self-hosted podcast database.

## Support

- **Podcast Index Support**: https://podcastindex.org/contact
- **Podcastic Issues**: Create an issue on GitHub
- **RSS Feed Help**: See `GETTING_STARTED.md` for manual subscription

---

**Last Updated**: 2026-04-16  
**Podcast Index Status**: [https://podcastindex.org/status](https://podcastindex.org/status)
