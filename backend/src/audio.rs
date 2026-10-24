//! Streaming audio proxy so the frontend can analyse cross-origin podcast
//! audio with the Web Audio API (`GET /api/audio/proxy?url=...`).

use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};
use url::Url;

use crate::{
    auth::AuthUser,
    error::{internal, AppError},
    netguard, AppState,
};

const MAX_REDIRECTS: usize = 8;
const URL_CACHE_TTL: Duration = Duration::from_secs(10 * 60);
const FORWARDED_HEADERS: [header::HeaderName; 4] = [
    header::CONTENT_TYPE,
    header::CONTENT_LENGTH,
    header::CONTENT_RANGE,
    header::ACCEPT_RANGES,
];

/// Remembers the final URL of a redirect chain so range requests (seeks)
/// skip the redirects.
#[derive(Default)]
pub struct UrlCache(Mutex<HashMap<String, (String, Instant)>>);

impl UrlCache {
    fn get(&self, original: &str) -> Option<String> {
        let mut map = self.0.lock().unwrap_or_else(|p| p.into_inner());
        match map.get(original) {
            Some((url, expires)) if *expires > Instant::now() => Some(url.clone()),
            Some(_) => {
                map.remove(original);
                None
            }
            None => None,
        }
    }

    fn set(&self, original: &str, resolved: &str) {
        let mut map = self.0.lock().unwrap_or_else(|p| p.into_inner());
        let now = Instant::now();
        if map.len() > 5_000 {
            map.retain(|_, (_, expires)| *expires > now);
        }
        map.insert(original.to_owned(), (resolved.to_owned(), now + URL_CACHE_TTL));
    }
}

/// Client used by the proxy: redirects are followed manually so every hop
/// goes through [`check_url`], and host names only resolve to public
/// addresses ([`netguard::PublicOnlyResolver`]).
pub fn client() -> reqwest::Result<reqwest::Client> {
    reqwest::Client::builder()
        .dns_resolver(std::sync::Arc::new(netguard::PublicOnlyResolver))
        .user_agent("Mozilla/5.0 (compatible; Podcastic/1.0)")
        .redirect(reqwest::redirect::Policy::none())
        .no_gzip()
        .no_brotli()
        .no_deflate()
        .connect_timeout(Duration::from_secs(10))
        .pool_idle_timeout(Duration::from_secs(90))
        .build()
}

/// Only public http(s) hosts may be proxied.
fn check_url(url: &Url) -> Result<(), AppError> {
    if !matches!(url.scheme(), "http" | "https") {
        return Err(AppError::bad_request("Protocol not allowed"));
    }
    if url.host().is_none() {
        return Err(AppError::bad_request("Invalid URL"));
    }
    if !netguard::url_allowed(url) {
        return Err(AppError::new(StatusCode::FORBIDDEN, "Forbidden"));
    }
    Ok(())
}

/// Short-lived token allowing the `<audio>` element (which cannot send an
/// `Authorization` header) to fetch one URL through the proxy.
pub async fn token(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, AppError> {
    let raw = params
        .get("url")
        .filter(|u| !u.is_empty())
        .ok_or_else(|| AppError::bad_request("url required"))?;
    let url = Url::parse(raw).map_err(|_| AppError::bad_request("Invalid URL"))?;
    check_url(&url)?;
    let token = state
        .jwt
        .sign_media(&user.id.to_hex(), raw)
        .map_err(internal("Failed to issue media token"))?;
    Ok(Json(json!({ "token": token })))
}

pub async fn proxy(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    let raw = params
        .get("url")
        .filter(|u| !u.is_empty())
        .ok_or_else(|| AppError::bad_request("url required"))?;
    let authorized = params
        .get("token")
        .is_some_and(|token| state.jwt.verify_media(token, raw));
    if !authorized {
        return Err(AppError::unauthorized("Invalid or expired media token"));
    }
    let original = Url::parse(raw).map_err(|_| AppError::bad_request("Invalid URL"))?;
    check_url(&original)?;

    let range = headers.get(header::RANGE).cloned();
    let mut url = state
        .audio_urls
        .get(raw)
        .and_then(|cached| Url::parse(&cached).ok())
        .unwrap_or(original);

    for hop in 0..=MAX_REDIRECTS {
        check_url(&url)?;
        let mut request = state.audio_http.get(url.clone()).header(header::ACCEPT, "*/*");
        if let Some(range) = &range {
            request = request.header(header::RANGE, range.clone());
        }
        let upstream = request
            .send()
            .await
            .map_err(|_| AppError::new(StatusCode::BAD_GATEWAY, "Proxy error"))?;

        if upstream.status().is_redirection() {
            if let Some(location) = upstream.headers().get(header::LOCATION) {
                let next = location
                    .to_str()
                    .ok()
                    .and_then(|loc| url.join(loc).ok())
                    .ok_or_else(|| AppError::bad_request("Invalid redirect URL"))?;
                url = next;
                continue;
            }
        }

        if hop > 0 {
            state.audio_urls.set(raw, url.as_str());
        }
        return Ok(stream_response(upstream));
    }

    Err(AppError::new(StatusCode::BAD_GATEWAY, "Too many redirects"))
}

fn stream_response(upstream: reqwest::Response) -> Response {
    let status = StatusCode::from_u16(upstream.status().as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
    let mut headers = HeaderMap::new();
    for name in FORWARDED_HEADERS {
        if let Some(value) = upstream.headers().get(name.as_str()) {
            if let Ok(value) = HeaderValue::from_bytes(value.as_bytes()) {
                headers.insert(name, value);
            }
        }
    }
    headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    headers.insert(
        header::ACCESS_CONTROL_EXPOSE_HEADERS,
        HeaderValue::from_static("Content-Length, Content-Range, Content-Type, Accept-Ranges"),
    );

    (status, headers, Body::from_stream(upstream.bytes_stream())).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn allowed(url: &str) -> bool {
        check_url(&Url::parse(url).unwrap()).is_ok()
    }

    #[test]
    fn blocks_internal_hosts() {
        assert!(allowed("https://cdn.example.com/a.mp3"));
        assert!(!allowed("http://localhost/a.mp3"));
        assert!(!allowed("http://127.0.0.1/a.mp3"));
        assert!(!allowed("http://192.168.1.10/a.mp3"));
        assert!(!allowed("http://169.254.169.254/latest"));
        assert!(!allowed("http://[::1]/a.mp3"));
        assert!(!allowed("http://redis:6379/"));
        assert!(!allowed("ftp://example.com/a.mp3"));
    }
}
