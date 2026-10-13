mod audio;
mod auth;
mod db;
mod episodes;
mod error;
mod feeds;
mod itunes;
mod podcasts;

use std::{
    collections::HashMap,
    env,
    net::{IpAddr, SocketAddr},
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{header, HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use mongodb::Database;
use redis::aio::ConnectionManager;
use serde_json::json;
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
};

use crate::auth::JwtConfig;

#[derive(Clone)]
pub struct AppState {
    pub db: Database,
    pub redis: ConnectionManager,
    pub http: reqwest::Client,
    pub jwt: Arc<JwtConfig>,
    pub audio_http: reqwest::Client,
    pub audio_urls: Arc<audio::UrlCache>,
    limiter: Arc<RateLimiter>,
}

/// Fixed-window, per-IP request limiter for the API routes.
struct RateLimiter {
    window: Duration,
    max: u32,
    hits: Mutex<HashMap<IpAddr, (Instant, u32)>>,
}

impl RateLimiter {
    fn new(window: Duration, max: u32) -> Self {
        Self { window, max, hits: Mutex::new(HashMap::new()) }
    }

    fn allow(&self, ip: IpAddr) -> bool {
        let now = Instant::now();
        let mut hits = self.hits.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if hits.len() > 10_000 {
            hits.retain(|_, (start, _)| now.duration_since(*start) < self.window);
        }
        let entry = hits.entry(ip).or_insert((now, 0));
        if now.duration_since(entry.0) >= self.window {
            *entry = (now, 0);
        }
        entry.1 += 1;
        entry.1 <= self.max
    }
}

async fn rate_limit(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Response {
    if state.limiter.allow(addr.ip()) {
        next.run(request).await
    } else {
        let body = json!({ "message": "Trop de requêtes, veuillez réessayer plus tard." });
        (StatusCode::TOO_MANY_REQUESTS, Json(body)).into_response()
    }
}

async fn connect_redis(url: &str) -> anyhow::Result<ConnectionManager> {
    let client = redis::Client::open(url)?;
    let mut attempt = 1;
    loop {
        match ConnectionManager::new(client.clone()).await {
            Ok(manager) => {
                tracing::info!("✓ Redis connected");
                return Ok(manager);
            }
            Err(err) if attempt < 15 => {
                tracing::warn!("Redis not ready (attempt {attempt}): {err}");
                attempt += 1;
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
            Err(err) => return Err(err.into()),
        }
    }
}

fn api_router(state: &AppState) -> Router<AppState> {
    let limited = || middleware::from_fn_with_state(state.clone(), rate_limit);

    let auth = Router::new()
        .route("/register", post(auth::register))
        .route("/login", post(auth::login))
        .route("/me", get(auth::me))
        .route("/logout", post(auth::logout));

    let podcasts = Router::new()
        .route("/subscriptions", get(podcasts::subscriptions))
        .route("/subscribe", post(podcasts::subscribe))
        .route("/subscribe-discovery", post(podcasts::subscribe_discovery))
        .route("/discover", get(podcasts::discover))
        .route("/trending", get(podcasts::trending))
        .route("/search", get(podcasts::search))
        .route("/:id", get(podcasts::get_one))
        .route("/:id/unsubscribe", delete(podcasts::unsubscribe))
        .route("/:id/sync", post(podcasts::sync))
        .layer(limited());

    let episodes = Router::new()
        .route("/latest", get(episodes::latest))
        .route("/search", get(episodes::search))
        .route("/progress", post(episodes::save_progress))
        .route("/progress/:id", get(episodes::get_progress))
        .route("/podcast/:id", get(episodes::for_podcast))
        .route("/:id", get(episodes::get_one))
        .layer(limited());

    Router::new()
        .route("/health", get(|| async { Json(json!({ "status": "ok", "message": "API is running" })) }))
        .nest("/auth", auth)
        .nest("/podcasts", podcasts)
        .nest("/episodes", episodes)
        .route("/audio/proxy", get(audio::proxy))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("podcastic=info,tower_http=warn")),
        )
        .init();

    let var = |key: &str, default: &str| env::var(key).unwrap_or_else(|_| default.to_owned());
    let port: u16 = var("PORT", "3579").parse()?;
    let jwt_secret = var("JWT_SECRET", "dev_secret_key");
    if jwt_secret == "dev_secret_key" || jwt_secret == "change_me_in_production" {
        tracing::warn!("JWT_SECRET uses a default value — set a strong secret in production");
    }

    let db = db::connect(&var("MONGODB_URI", "mongodb://localhost:27017/podcastic")).await?;
    let redis = connect_redis(&var("REDIS_URL", "redis://localhost:6379")).await?;
    let http = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        )
        .connect_timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()?;

    let state = AppState {
        db,
        redis,
        http,
        jwt: Arc::new(JwtConfig::new(
            &jwt_secret,
            &var("JWT_EXPIRES_IN", "7d"),
            &var("JWT_REFRESH_EXPIRES_IN", "30d"),
        )),
        limiter: Arc::new(RateLimiter::new(Duration::from_secs(15 * 60), 300)),
        audio_http: audio::client()?,
        audio_urls: Arc::new(audio::UrlCache::default()),
    };

    feeds::start_background_sync(state.clone());

    // Frontend build served as static files with an SPA fallback.
    let public = PathBuf::from(var("PUBLIC_DIR", "public"));
    let spa = ServeDir::new(&public).fallback(ServeFile::new(public.join("index.html")));

    let app = Router::new()
        .route(
            "/health",
            get(|| async { Json(json!({ "status": "ok", "timestamp": chrono::Utc::now().to_rfc3339() })) }),
        )
        .nest("/api", api_router(&state))
        .fallback_service(spa)
        .layer(CorsLayer::permissive())
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("SAMEORIGIN"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("no-referrer"),
        ))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], port))).await?;
    tracing::info!("🎙️  Podcastic (Rust) running on http://0.0.0.0:{port}");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut signal) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            signal.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    tracing::info!("Shutting down gracefully...");
}
