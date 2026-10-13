//! iTunes Search API — free, no API key required.

use std::time::Duration;

use serde::Serialize;
use serde_json::Value;

const TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub rss_url: String,
    pub description: String,
    pub author: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub episode_count: Option<i64>,
}

fn str_of<'a>(item: &'a Value, key: &str) -> Option<&'a str> {
    item.get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
}

fn map_result(item: &Value) -> Option<SearchResult> {
    let rss_url = str_of(item, "feedUrl")?;
    let id = match item.get("collectionId")? {
        Value::Number(n) => n.to_string(),
        Value::String(s) => s.clone(),
        _ => return None,
    };
    Some(SearchResult {
        id,
        title: str_of(item, "collectionName").unwrap_or_default().to_owned(),
        rss_url: rss_url.to_owned(),
        description: str_of(item, "description")
            .or_else(|| str_of(item, "primaryGenreName"))
            .unwrap_or_default()
            .to_owned(),
        author: str_of(item, "artistName").unwrap_or_default().to_owned(),
        image_url: str_of(item, "artworkUrl600")
            .or_else(|| str_of(item, "artworkUrl100"))
            .map(str::to_owned),
        episode_count: item.get("trackCount").and_then(Value::as_i64),
    })
}

fn map_results(body: &Value) -> Vec<SearchResult> {
    body.get("results")
        .and_then(Value::as_array)
        .map(|items| items.iter().filter_map(map_result).collect())
        .unwrap_or_default()
}

pub async fn search(
    http: &reqwest::Client,
    query: &str,
    limit: usize,
) -> anyhow::Result<Vec<SearchResult>> {
    let term = query.trim();
    if term.is_empty() {
        return Ok(Vec::new());
    }

    // Fetch more candidates than needed, then respect the requested limit.
    let body: Value = http
        .get("https://itunes.apple.com/search")
        .query(&[
            ("term", term),
            ("media", "podcast"),
            ("entity", "podcast"),
            ("country", "FR"),
            ("limit", "100"),
        ])
        .timeout(TIMEOUT)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    let mut results = map_results(&body);
    results.truncate(limit);
    Ok(results)
}

pub async fn trending(
    http: &reqwest::Client,
    limit: usize,
    genre: Option<&str>,
) -> anyhow::Result<Vec<SearchResult>> {
    let cap = limit.clamp(1, 50);
    let genre_path = genre
        .filter(|g| !g.is_empty() && g.chars().all(|c| c.is_ascii_alphanumeric()))
        .map(|g| format!("/genre={g}"))
        .unwrap_or_default();

    let feed: Value = http
        .get(format!(
            "https://itunes.apple.com/fr/rss/toppodcasts/limit={cap}{genre_path}/json"
        ))
        .timeout(TIMEOUT)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    // A single entry is serialized as an object rather than an array.
    let entries = match feed.pointer("/feed/entry") {
        Some(Value::Array(entries)) => entries.clone(),
        Some(entry @ Value::Object(_)) => vec![entry.clone()],
        _ => Vec::new(),
    };
    let ids: Vec<&str> = entries
        .iter()
        .filter_map(|e| e.pointer("/id/attributes/im:id").and_then(Value::as_str))
        .collect();
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let lookup: Value = http
        .get("https://itunes.apple.com/lookup")
        .query(&[("id", ids.join(",").as_str()), ("entity", "podcast")])
        .timeout(TIMEOUT)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?;

    Ok(map_results(&lookup))
}
