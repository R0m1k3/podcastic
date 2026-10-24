//! RSS feed fetching, parsing and episode synchronisation.

use std::{collections::HashSet, time::Duration};

use anyhow::{anyhow, bail, Context};
use bson::{doc, oid::ObjectId, Bson, Document};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use mongodb::{
    error::{ErrorKind, Error as MongoError},
    options::{FindOptions, InsertManyOptions},
    Collection,
};
use redis::AsyncCommands;
use reqwest::header::ACCEPT;
use serde_json::{json, Value};

use crate::{
    db::{self, coll, EPISODES, PODCASTS},
    AppState,
};

const SYNC_CACHE_TTL_SECS: u64 = 6 * 60 * 60;

#[derive(Debug)]
pub struct FeedData {
    pub title: String,
    pub description: String,
    pub author: String,
    pub image_url: Option<String>,
    pub language: String,
    pub episodes: Vec<ParsedEpisode>,
}

#[derive(Debug)]
pub struct ParsedEpisode {
    pub title: String,
    pub description: String,
    pub audio_url: String,
    pub pub_date: DateTime<Utc>,
    pub duration: i64,
    pub guid: String,
    pub image_url: Option<String>,
}

pub async fn fetch_feed(http: &reqwest::Client, url: &str) -> anyhow::Result<FeedData> {
    fetch_and_parse(http, url).await.map_err(|err| {
        tracing::warn!("RSS parsing error for {url}: {err}");
        anyhow!("Failed to parse RSS feed: {err}")
    })
}

async fn fetch_and_parse(http: &reqwest::Client, url: &str) -> anyhow::Result<FeedData> {
    // IP literals bypass the resolver: check the URL itself (redirects are
    // re-checked by the client's policy, host names by its resolver).
    let parsed = reqwest::Url::parse(url).context("Invalid URL")?;
    if !crate::netguard::url_allowed(&parsed) {
        bail!("URL not allowed");
    }
    let response = http
        .get(url)
        .header(ACCEPT, "application/rss+xml, application/xml, text/xml, */*")
        .timeout(Duration::from_secs(30))
        .send()
        .await?;
    if !response.status().is_success() {
        bail!("Status code {}", response.status().as_u16());
    }
    let bytes = response.bytes().await?;
    let channel = rss::Channel::read_from(&bytes[..])?;
    parse_channel(&channel)
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|s| !s.is_empty())
}

pub fn parse_channel(channel: &rss::Channel) -> anyhow::Result<FeedData> {
    let title = channel.title().trim();
    if title.is_empty() {
        bail!("Invalid RSS feed - missing title");
    }
    let itunes = channel.itunes_ext();

    let image_url = non_empty(channel.image().map(|i| i.url()))
        .or_else(|| non_empty(itunes.and_then(|i| i.image())))
        .map(str::to_owned);

    let author = non_empty(itunes.and_then(|i| i.author()))
        .or_else(|| {
            non_empty(
                channel
                    .dublin_core_ext()
                    .and_then(|dc| dc.creators().first().map(String::as_str)),
            )
        })
        .or_else(|| non_empty(channel.managing_editor()))
        .unwrap_or_default()
        .to_owned();

    let description = non_empty(Some(channel.description()))
        .or_else(|| non_empty(itunes.and_then(|i| i.summary())))
        .or_else(|| non_empty(itunes.and_then(|i| i.subtitle())))
        .unwrap_or_default()
        .to_owned();

    let language = channel
        .language()
        .and_then(|l| l.split('-').next())
        .map(|l| l.trim().to_lowercase())
        .unwrap_or_default();

    let mut episodes: Vec<ParsedEpisode> = channel
        .items()
        .iter()
        .filter_map(|item| parse_item(item, image_url.as_deref()))
        .collect();
    episodes.sort_by(|a, b| b.pub_date.cmp(&a.pub_date));

    tracing::info!(
        "[RSS Parser] \"{title}\": author={author:?}, image={}, episodes={}",
        image_url.is_some(),
        episodes.len()
    );

    Ok(FeedData {
        title: title.to_owned(),
        description,
        author,
        image_url,
        language,
        episodes,
    })
}

fn media_attr<'a>(item: &'a rss::Item, name: &str) -> Option<&'a str> {
    item.extensions()
        .get("media")
        .and_then(|media| media.get("content"))
        .and_then(|contents| contents.first())
        .and_then(|ext| ext.attrs().get(name))
        .map(String::as_str)
}

fn is_mp3(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.ends_with(".mp3") || lower.contains(".mp3?")
}

/// First `href="...mp3..."` found in an HTML fragment.
fn mp3_href(html: &str) -> Option<String> {
    let mut rest = html;
    while let Some(pos) = rest.find("href=") {
        rest = &rest[pos + 5..];
        let Some(quote) = rest.chars().next().filter(|c| *c == '"' || *c == '\'') else {
            continue;
        };
        rest = &rest[1..];
        let end = rest.find(quote)?;
        let candidate = &rest[..end];
        if candidate.to_ascii_lowercase().contains(".mp3") {
            return Some(candidate.to_owned());
        }
        rest = &rest[end..];
    }
    None
}

fn extract_audio_url(item: &rss::Item) -> Option<String> {
    if let Some(url) = non_empty(item.enclosure().map(|e| e.url())) {
        return Some(url.to_owned());
    }
    if let Some(url) = non_empty(media_attr(item, "url")) {
        return Some(url.to_owned());
    }
    if let Some(link) = non_empty(item.link()).filter(|l| is_mp3(l)) {
        return Some(link.to_owned());
    }
    if let Some(guid) = non_empty(item.guid().map(|g| g.value())).filter(|g| is_mp3(g)) {
        return Some(guid.to_owned());
    }
    item.content().and_then(mp3_href)
}

/// Parses "HH:MM:SS", "MM:SS" or a plain number of seconds.
fn parse_duration(raw: &str) -> i64 {
    let parts: Option<Vec<f64>> = raw
        .trim()
        .split(':')
        .map(|p| p.trim().parse::<f64>().ok())
        .collect();
    let seconds = match parts.as_deref() {
        Some([h, m, s]) => h * 3600.0 + m * 60.0 + s,
        Some([m, s]) => m * 60.0 + s,
        Some([s]) => *s,
        _ => 0.0,
    };
    if seconds.is_finite() && seconds > 0.0 {
        seconds as i64
    } else {
        0
    }
}

fn extract_image_url(item: &rss::Item, podcast_image: Option<&str>) -> Option<String> {
    if let Some(image) = non_empty(item.itunes_ext().and_then(|i| i.image())) {
        return Some(image.to_owned());
    }
    if media_attr(item, "medium") == Some("image") {
        if let Some(url) = non_empty(media_attr(item, "url")) {
            return Some(url.to_owned());
        }
    }
    podcast_image.map(str::to_owned)
}

/// Lenient date parsing: RFC 2822 (incl. common named time zones), RFC 3339, plain dates.
pub fn parse_date(raw: &str) -> Option<DateTime<Utc>> {
    let raw = raw.trim();
    if let Ok(dt) = DateTime::parse_from_rfc2822(raw) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(raw) {
        return Some(dt.with_timezone(&Utc));
    }

    const ZONES: &[(&str, &str)] = &[
        ("CEST", "+0200"), ("CET", "+0100"), ("BST", "+0100"), ("IST", "+0530"),
        ("PDT", "-0700"), ("PST", "-0800"), ("MDT", "-0600"), ("MST", "-0700"),
        ("CDT", "-0500"), ("CST", "-0600"), ("EDT", "-0400"), ("EST", "-0500"),
        ("UTC", "+0000"), ("GMT", "+0000"), ("Z", "+0000"),
    ];
    for (name, offset) in ZONES {
        if let Some(prefix) = raw.strip_suffix(name) {
            let candidate = format!("{} {offset}", prefix.trim_end());
            if let Ok(dt) = DateTime::parse_from_rfc2822(&candidate) {
                return Some(dt.with_timezone(&Utc));
            }
        }
    }

    // Drop a leading weekday ("Mon, ") that may be wrong or localised.
    let without_weekday = raw.split_once(", ").map(|(_, rest)| rest).unwrap_or(raw);
    for format in ["%d %b %Y %H:%M:%S %z", "%d %B %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%.f%z"] {
        if let Ok(dt) = DateTime::parse_from_str(without_weekday, format) {
            return Some(dt.with_timezone(&Utc));
        }
    }
    for format in ["%d %b %Y %H:%M:%S", "%d %b %Y %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"] {
        if let Ok(dt) = NaiveDateTime::parse_from_str(without_weekday, format) {
            return Some(dt.and_utc());
        }
    }
    for format in ["%Y-%m-%d", "%d %b %Y"] {
        if let Ok(date) = NaiveDate::parse_from_str(without_weekday, format) {
            return date.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc());
        }
    }
    None
}

fn decode_entities(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(pos) = rest.find('&') {
        out.push_str(&rest[..pos]);
        rest = &rest[pos..];
        let decoded = rest.find(';').filter(|end| *end <= 10).and_then(|end| {
            let entity = &rest[1..end];
            let ch = match entity {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                "nbsp" => Some('\u{a0}'),
                "hellip" => Some('…'),
                "rsquo" => Some('’'),
                "lsquo" => Some('‘'),
                "rdquo" => Some('”'),
                "ldquo" => Some('“'),
                "ndash" => Some('–'),
                "mdash" => Some('—'),
                "eacute" => Some('é'),
                "egrave" => Some('è'),
                "agrave" => Some('à'),
                "ccedil" => Some('ç'),
                _ => entity
                    .strip_prefix("#x")
                    .or_else(|| entity.strip_prefix("#X"))
                    .and_then(|hex| u32::from_str_radix(hex, 16).ok())
                    .or_else(|| entity.strip_prefix('#').and_then(|d| d.parse().ok()))
                    .and_then(char::from_u32),
            }?;
            Some((ch, end))
        });
        match decoded {
            Some((ch, end)) => {
                out.push(ch);
                rest = &rest[end + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// Plain-text snippet of an HTML fragment (mirrors rss-parser's `contentSnippet`).
/// Entities are decoded *before* tags are stripped, so encoded markup
/// (`&lt;img onerror=…&gt;`) cannot come out as real markup.
pub fn html_to_text(html: &str) -> String {
    let decoded = decode_entities(html);
    let html = decoded.as_str();
    const BLOCK_TAGS: &[&str] = &[
        "br", "p", "ul", "ol", "li", "blockquote", "section", "table", "tr", "div", "h1", "h2",
        "h3", "h4", "h5", "h6",
    ];
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find('<') {
        out.push_str(&rest[..start]);
        let Some(end) = rest[start..].find('>') else {
            rest = &rest[start..];
            break;
        };
        let tag = rest[start + 1..start + end]
            .trim_start_matches('/')
            .split(|c: char| c.is_whitespace() || c == '/')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        if BLOCK_TAGS.contains(&tag.as_str()) && !out.ends_with('\n') && !out.is_empty() {
            out.push('\n');
        }
        rest = &rest[start + end + 1..];
    }
    // An unterminated tag (`<img src=x onerror=…` with no `>`) is dropped too.
    if !rest.starts_with('<') {
        out.push_str(rest);
    }
    out.trim().to_owned()
}

fn parse_item(item: &rss::Item, podcast_image: Option<&str>) -> Option<ParsedEpisode> {
    let title = non_empty(item.title())?.to_owned();
    let audio_url = extract_audio_url(item)?;
    let itunes = item.itunes_ext();

    let description = non_empty(item.description())
        .or_else(|| non_empty(itunes.and_then(|i| i.summary())))
        .or_else(|| non_empty(item.content()))
        .map(html_to_text)
        .unwrap_or_default();

    let raw_date = non_empty(item.pub_date());
    let pub_date = raw_date.and_then(parse_date).unwrap_or_else(Utc::now);

    let guid = non_empty(item.guid().map(|g| g.value()))
        .or_else(|| non_empty(item.link()))
        .map(str::to_owned)
        .unwrap_or_else(|| format!("{title}-{}", raw_date.unwrap_or("undefined")));

    Some(ParsedEpisode {
        description,
        audio_url,
        pub_date,
        duration: itunes.and_then(|i| i.duration()).map(parse_duration).unwrap_or(0),
        guid,
        image_url: extract_image_url(item, podcast_image),
        title,
    })
}

fn opt_bson(value: &Option<String>) -> Bson {
    value.clone().map(Bson::String).unwrap_or(Bson::Null)
}

fn episode_doc(podcast_id: ObjectId, episode: &ParsedEpisode, now: bson::DateTime) -> Document {
    doc! {
        "podcastId": podcast_id,
        "title": episode.title.as_str(),
        "description": episode.description.as_str(),
        "audioUrl": episode.audio_url.as_str(),
        "pubDate": bson::DateTime::from_chrono(episode.pub_date),
        "duration": episode.duration,
        "guid": episode.guid.as_str(),
        "imageUrl": opt_bson(&episode.image_url),
        "createdAt": now,
        "updatedAt": now,
        "__v": 0,
    }
}

/// Inserts episodes, silently skipping ones already stored (duplicate guid).
async fn insert_episodes(
    collection: &Collection<Document>,
    docs: Vec<Document>,
) -> mongodb::error::Result<u64> {
    if docs.is_empty() {
        return Ok(0);
    }
    let total = docs.len() as u64;
    let options = InsertManyOptions::builder().ordered(false).build();
    match collection.insert_many(docs, options).await {
        Ok(result) => Ok(result.inserted_ids.len() as u64),
        Err(err) => match duplicate_only_failures(&err) {
            Some(skipped) => Ok(total.saturating_sub(skipped)),
            None => Err(err),
        },
    }
}

fn duplicate_only_failures(err: &MongoError) -> Option<u64> {
    match err.kind.as_ref() {
        ErrorKind::BulkWrite(failure) if failure.write_concern_error.is_none() => {
            let errors = failure.write_errors.as_ref()?;
            errors
                .iter()
                .all(|e| e.code == 11000)
                .then_some(errors.len() as u64)
        }
        _ => None,
    }
}

/// Creates a podcast (and its episodes) from an RSS feed. If another request
/// created it concurrently, the existing document is returned.
pub async fn create_podcast_from_rss(state: &AppState, rss_url: &str) -> anyhow::Result<Document> {
    let feed = fetch_feed(&state.http, rss_url).await?;
    let podcasts = coll(&state.db, PODCASTS);
    let now = db::now();
    let latest = feed.episodes.first();
    let language = if feed.language.is_empty() { "en" } else { feed.language.as_str() };
    let last_title = latest.map(|e| e.title.clone()).unwrap_or_default();
    let last_date = latest
        .map(|e| Bson::DateTime(bson::DateTime::from_chrono(e.pub_date)))
        .unwrap_or(Bson::Null);

    let mut podcast = doc! {
        "title": feed.title.as_str(),
        "description": feed.description.as_str(),
        "rssUrl": rss_url,
        "imageUrl": opt_bson(&feed.image_url),
        "author": feed.author.as_str(),
        "category": [],
        "language": language,
        "lastFetched": now,
        "episodeCount": 0,
        "lastEpisodeTitle": last_title,
        "lastEpisodeDate": last_date,
        "createdAt": now,
        "updatedAt": now,
        "__v": 0,
    };

    let podcast_id = match podcasts.insert_one(&podcast, None).await {
        Ok(result) => result
            .inserted_id
            .as_object_id()
            .context("unexpected podcast id type")?,
        Err(err) if db::is_duplicate_key(&err) => {
            return podcasts
                .find_one(doc! { "rssUrl": rss_url }, None)
                .await?
                .ok_or_else(|| anyhow!("Podcast not found"));
        }
        Err(err) => return Err(err.into()),
    };

    let episodes = coll(&state.db, EPISODES);
    let docs = feed
        .episodes
        .iter()
        .map(|e| episode_doc(podcast_id, e, now))
        .collect();
    insert_episodes(&episodes, docs).await?;

    let count = episodes
        .count_documents(doc! { "podcastId": podcast_id }, None)
        .await? as i64;
    podcasts
        .update_one(
            doc! { "_id": podcast_id },
            doc! { "$set": { "episodeCount": count } },
            None,
        )
        .await?;

    if feed.episodes.is_empty() {
        tracing::warn!("[RSS Parser] No episodes found for {} during creation.", feed.title);
    }

    podcast.insert("_id", podcast_id);
    podcast.insert("episodeCount", count);
    Ok(podcast)
}

fn is_blank(podcast: &Document, key: &str) -> bool {
    podcast.get_str(key).map(|s| s.trim().is_empty()).unwrap_or(true)
}

/// Fetches the feed and stores new episodes. Results are cached in Redis for
/// six hours unless `force` is set.
pub async fn sync_podcast(
    state: &AppState,
    podcast_id: ObjectId,
    rss_url: &str,
    force: bool,
) -> anyhow::Result<Value> {
    let cache_key = format!("podcast:{}:sync", podcast_id.to_hex());
    let mut redis = state.redis.clone();

    if !force {
        if let Ok(Some(cached)) = redis.get::<_, Option<String>>(&cache_key).await {
            if let Ok(value) = serde_json::from_str::<Value>(&cached) {
                return Ok(value);
            }
        }
    }

    let podcasts = coll(&state.db, PODCASTS);
    let podcast = podcasts
        .find_one(doc! { "_id": podcast_id }, None)
        .await?
        .ok_or_else(|| anyhow!("Podcast not found"))?;

    let feed = fetch_feed(&state.http, rss_url).await?;
    let episodes = coll(&state.db, EPISODES);
    let now = db::now();

    let known: HashSet<String> = episodes
        .distinct("guid", doc! { "podcastId": podcast_id }, None)
        .await?
        .into_iter()
        .filter_map(|guid| guid.as_str().map(str::to_owned))
        .collect();
    let new_docs: Vec<Document> = feed
        .episodes
        .iter()
        .filter(|e| !known.contains(&e.guid))
        .map(|e| episode_doc(podcast_id, e, now))
        .collect();
    let new_count = insert_episodes(&episodes, new_docs).await?;

    let total = episodes
        .count_documents(doc! { "podcastId": podcast_id }, None)
        .await? as i64;

    let mut set = doc! { "lastFetched": now, "episodeCount": total, "updatedAt": now };
    if feed.title != "Unknown Podcast" {
        set.insert("title", feed.title.as_str());
    }
    if !feed.author.is_empty() && (force || is_blank(&podcast, "author")) {
        set.insert("author", feed.author.as_str());
    }
    if let Some(image) = &feed.image_url {
        if force || is_blank(&podcast, "imageUrl") {
            set.insert("imageUrl", image.as_str());
        }
    }
    if !feed.description.is_empty() && (force || is_blank(&podcast, "description")) {
        set.insert("description", feed.description.as_str());
    }
    if !feed.language.is_empty() && (force || is_blank(&podcast, "language")) {
        set.insert("language", feed.language.as_str());
    }
    if let Some(latest) = feed.episodes.first() {
        set.insert("lastEpisodeTitle", latest.title.as_str());
        set.insert("lastEpisodeDate", bson::DateTime::from_chrono(latest.pub_date));
    }
    podcasts
        .update_one(doc! { "_id": podcast_id }, doc! { "$set": set }, None)
        .await?;

    let result = json!({
        "success": true,
        "newEpisodes": new_count,
        "totalEpisodes": total,
        "lastFetched": db::iso(now),
    });
    if let Err(err) = redis
        .set_ex::<_, _, ()>(&cache_key, result.to_string(), SYNC_CACHE_TTL_SECS)
        .await
    {
        tracing::warn!("Redis cache write failed: {err}");
    }
    Ok(result)
}

async fn podcasts_matching(state: &AppState, filter: Document) -> Vec<Document> {
    let options = FindOptions::builder()
        .projection(doc! { "_id": 1, "rssUrl": 1, "title": 1 })
        .build();
    match db::find_all(&coll(&state.db, PODCASTS), filter, options).await {
        Ok(podcasts) => podcasts,
        Err(err) => {
            tracing::error!("[Sync Engine] Failed to list podcasts: {err}");
            Vec::new()
        }
    }
}

async fn sync_all(state: AppState) {
    let podcasts = podcasts_matching(&state, doc! {}).await;
    tracing::info!("[Sync Engine] Processing {} podcasts...", podcasts.len());
    for podcast in podcasts {
        let (Ok(id), Ok(url)) = (podcast.get_object_id("_id"), podcast.get_str("rssUrl")) else {
            continue;
        };
        if let Err(err) = sync_podcast(&state, id, url, false).await {
            let title = podcast.get_str("title").unwrap_or_default();
            tracing::error!("[Sync Engine] Failed to sync {title}: {err}");
        }
        // Avoid hammering feed hosts.
        tokio::time::sleep(Duration::from_secs(5)).await;
    }
    tracing::info!("[Sync Engine] Global sync completed");
}

async fn sync_empty(state: AppState) {
    let podcasts = podcasts_matching(&state, doc! { "episodeCount": 0 }).await;
    if podcasts.is_empty() {
        return;
    }
    tracing::info!("[Sync Engine] Retrying {} empty podcasts...", podcasts.len());
    for podcast in podcasts {
        let (Ok(id), Ok(url)) = (podcast.get_object_id("_id"), podcast.get_str("rssUrl")) else {
            continue;
        };
        if let Err(err) = sync_podcast(&state, id, url, true).await {
            tracing::error!("[Sync Engine] Empty podcast sync failed: {err}");
        }
    }
}

/// Hourly: retry podcasts without episodes. Every 4 hours: sync the whole library.
pub fn start_background_sync(state: AppState) {
    tracing::info!("✓ Background Sync Engine started");
    tokio::spawn(async move {
        loop {
            let now = Utc::now();
            let next = now.timestamp() - now.timestamp().rem_euclid(3600) + 3600;
            let wait_ms = (next * 1000 - now.timestamp_millis()).max(1000) as u64;
            tokio::time::sleep(Duration::from_millis(wait_ms)).await;

            if (next / 3600) % 4 == 0 {
                tracing::info!("[Cron] Starting global library sync");
                tokio::spawn(sync_all(state.clone()));
            }
            tokio::spawn(sync_empty(state.clone()));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    const FEED: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Mon Podcast</title>
    <description>Desc</description>
    <language>fr-FR</language>
    <itunes:author>Radio</itunes:author>
    <itunes:image href="https://example.com/cover.jpg"/>
    <item>
      <title>Episode 1</title>
      <description><![CDATA[<p>Hello &amp; welcome</p><p>Second</p>]]></description>
      <pubDate>Mon, 01 Jan 2024 10:00:00 +0000</pubDate>
      <guid>ep-1</guid>
      <enclosure url="https://example.com/1.mp3" type="audio/mpeg" length="1"/>
      <itunes:duration>01:02:03</itunes:duration>
    </item>
    <item>
      <title>Episode 2</title>
      <pubDate>Tue, 02 Jan 2024 10:00:00 CET</pubDate>
      <media:content url="https://example.com/2.mp3" medium="audio"/>
    </item>
    <item>
      <title>No audio</title>
    </item>
  </channel>
</rss>"#;

    #[test]
    fn parses_feed() {
        let channel = rss::Channel::read_from(FEED.as_bytes()).unwrap();
        let feed = parse_channel(&channel).unwrap();
        assert_eq!(feed.title, "Mon Podcast");
        assert_eq!(feed.author, "Radio");
        assert_eq!(feed.language, "fr");
        assert_eq!(feed.image_url.as_deref(), Some("https://example.com/cover.jpg"));
        assert_eq!(feed.episodes.len(), 2);

        let newest = &feed.episodes[0];
        assert_eq!(newest.title, "Episode 2");
        assert_eq!(newest.audio_url, "https://example.com/2.mp3");
        assert_eq!(newest.image_url.as_deref(), Some("https://example.com/cover.jpg"));

        let first = &feed.episodes[1];
        assert_eq!(first.guid, "ep-1");
        assert_eq!(first.duration, 3723);
        assert_eq!(first.description, "Hello & welcome\nSecond");
    }

    #[test]
    fn parses_durations() {
        assert_eq!(parse_duration("1:00:00"), 3600);
        assert_eq!(parse_duration("05:30"), 330);
        assert_eq!(parse_duration("1234"), 1234);
        assert_eq!(parse_duration("abc"), 0);
    }

    #[test]
    fn parses_dates() {
        assert!(parse_date("Mon, 01 Jan 2024 10:00:00 GMT").is_some());
        assert!(parse_date("Mon, 01 Jan 2024 10:00:00 CEST").is_some());
        assert!(parse_date("2024-01-01T10:00:00Z").is_some());
        assert!(parse_date("2024-01-01").is_some());
        assert!(parse_date("not a date").is_none());
    }

    #[test]
    fn html_to_text_never_outputs_markup() {
        assert_eq!(html_to_text("<p>Bonjour &amp; bienvenue</p>"), "Bonjour & bienvenue");
        let text = html_to_text("&lt;img src=x onerror=alert(1)&gt;Salut");
        assert_eq!(text, "Salut");
        assert!(!html_to_text("Fin <img src=x onerror=alert(1)").contains('<'));
        assert!(!html_to_text("&#60;script&#62;alert(1)&#60;/script&#62;").contains("<script"));
    }

    #[test]
    fn finds_mp3_in_html() {
        assert_eq!(
            mp3_href(r#"<a href="https://x.com/a.mp3?x=1">dl</a>"#).as_deref(),
            Some("https://x.com/a.mp3?x=1")
        );
        assert_eq!(mp3_href(r#"<a href=nope>x</a>"#), None);
    }
}
