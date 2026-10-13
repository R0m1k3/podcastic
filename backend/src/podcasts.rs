use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use bson::{doc, oid::ObjectId, Document};
use mongodb::options::FindOptions;
use serde_json::{json, Value};

use crate::{
    auth::AuthUser,
    db::{self, coll, find_all, PODCASTS, SUBSCRIPTIONS},
    error::{internal, issue, ApiResult, AppError},
    feeds, itunes, AppState,
};

type Params = Query<HashMap<String, String>>;

/// `Number(value) || default` semantics for pagination parameters.
pub fn num_param(params: &HashMap<String, String>, key: &str, default: i64) -> i64 {
    params
        .get(key)
        .and_then(|v| v.trim().parse::<f64>().ok())
        .filter(|v| v.is_finite() && *v > 0.0)
        .map(|v| v as i64)
        .unwrap_or(default)
}

fn escape_regex(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for c in text.chars() {
        if "\\^$.|?*+()[]{}/".contains(c) {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

pub async fn subscriptions(State(state): State<AppState>, user: AuthUser) -> ApiResult {
    let options = FindOptions::builder().sort(doc! { "subscribedAt": -1 }).build();
    let subs = find_all(&coll(&state.db, SUBSCRIPTIONS), doc! { "userId": user.id }, options)
        .await
        .map_err(internal("Failed to fetch subscriptions"))?;

    let ids: Vec<ObjectId> = subs
        .iter()
        .filter_map(|s| s.get_object_id("podcastId").ok())
        .collect();
    let mut podcasts: HashMap<ObjectId, Document> =
        find_all(&coll(&state.db, PODCASTS), doc! { "_id": { "$in": ids } }, None)
            .await
            .map_err(internal("Failed to fetch subscriptions"))?
            .into_iter()
            .filter_map(|p| Some((p.get_object_id("_id").ok()?, p)))
            .collect();

    let list: Vec<Value> = subs
        .iter()
        .filter_map(|sub| {
            let mut podcast = podcasts.remove(&sub.get_object_id("podcastId").ok()?)?;
            podcast.insert("subscriptionId", sub.get_object_id("_id").ok()?.to_hex());
            Some(db::doc_to_json(podcast))
        })
        .collect();

    Ok(Json(json!({ "count": list.len(), "podcasts": list })))
}

async fn subscribe_user(state: &AppState, user: &AuthUser, rss_url: &str) -> ApiResult {
    let podcasts = coll(&state.db, PODCASTS);
    let existing = podcasts
        .find_one(doc! { "rssUrl": rss_url }, None)
        .await
        .map_err(internal("Impossible de s'abonner"))?;

    let podcast = match existing {
        Some(podcast) => podcast,
        None => feeds::create_podcast_from_rss(state, rss_url)
            .await
            .map_err(|err| {
                AppError::bad_request(format!("Impossible de récupérer le podcast : {err}"))
            })?,
    };
    let podcast_id = podcast
        .get_object_id("_id")
        .map_err(internal("Impossible de s'abonner"))?;

    let subs = coll(&state.db, SUBSCRIPTIONS);
    let filter = doc! { "userId": user.id, "podcastId": podcast_id };
    let already = subs
        .find_one(filter, None)
        .await
        .map_err(internal("Impossible de s'abonner"))?
        .is_some();

    if !already {
        let now = db::now();
        let subscription = doc! {
            "userId": user.id,
            "podcastId": podcast_id,
            "subscribedAt": now,
            "isFavorite": false,
            "createdAt": now,
            "updatedAt": now,
            "__v": 0,
        };
        if let Err(err) = subs.insert_one(subscription, None).await {
            if !db::is_duplicate_key(&err) {
                return Err(internal("Impossible de s'abonner")(err));
            }
        }
    }

    Ok(Json(json!({
        "message": if already { "Déjà abonné" } else { "Abonnement réussi" },
        "podcast": db::doc_to_json(podcast),
    })))
}

pub async fn subscribe(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<Value>,
) -> ApiResult {
    let rss_url = body
        .get("rssUrl")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if reqwest::Url::parse(rss_url).is_err() {
        return Err(AppError::validation(vec![issue("rssUrl", "Invalid RSS URL")]));
    }
    subscribe_user(&state, &user, rss_url).await
}

pub async fn subscribe_discovery(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<Value>,
) -> ApiResult {
    let rss_url = body
        .get("rssUrl")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if rss_url.is_empty() {
        return Err(AppError::bad_request("RSS URL required"));
    }
    subscribe_user(&state, &user, rss_url).await
}

pub async fn unsubscribe(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<String>,
) -> ApiResult {
    let not_found = || AppError::not_found("Subscription not found");
    let id = db::oid(&id).ok_or_else(not_found)?;
    let subs = coll(&state.db, SUBSCRIPTIONS);

    // The frontend may send either the subscription id or the podcast id.
    let mut deleted = subs
        .find_one_and_delete(doc! { "_id": id, "userId": user.id }, None)
        .await
        .map_err(internal("Failed to unsubscribe"))?;
    if deleted.is_none() {
        deleted = subs
            .find_one_and_delete(doc! { "userId": user.id, "podcastId": id }, None)
            .await
            .map_err(internal("Failed to unsubscribe"))?;
    }
    let deleted = deleted.ok_or_else(not_found)?;
    let deleted_id = deleted.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_default();
    tracing::info!("[Unsubscribe] Removed subscription {deleted_id}");

    Ok(Json(json!({ "message": "Unsubscribed successfully", "deletedId": deleted_id })))
}

pub async fn sync(
    State(state): State<AppState>,
    _user: AuthUser,
    Path(id): Path<String>,
) -> ApiResult {
    let not_found = || AppError::not_found("Podcast not found");
    let id = db::oid(&id).ok_or_else(not_found)?;
    let podcast = coll(&state.db, PODCASTS)
        .find_one(doc! { "_id": id }, None)
        .await
        .map_err(internal("Failed to sync podcast"))?
        .ok_or_else(not_found)?;
    let rss_url = podcast.get_str("rssUrl").unwrap_or_default();

    tracing::info!("[Sync] Manual sync for {}", podcast.get_str("title").unwrap_or_default());
    feeds::sync_podcast(&state, id, rss_url, true)
        .await
        .map(Json)
        .map_err(|err| {
            tracing::error!("Manual sync error: {err}");
            AppError::new(StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
        })
}

pub async fn search(State(state): State<AppState>, Query(params): Params) -> ApiResult {
    let query = params.get("q").map(String::as_str).unwrap_or_default();
    if query.is_empty() {
        return Err(AppError::bad_request("Search query required"));
    }
    let score = doc! { "score": { "$meta": "textScore" } };
    let options = FindOptions::builder()
        .projection(score.clone())
        .sort(score)
        .skip(num_param(&params, "skip", 0) as u64)
        .limit(num_param(&params, "limit", 20))
        .build();
    let podcasts: Vec<Value> = find_all(
        &coll(&state.db, PODCASTS),
        doc! { "$text": { "$search": query } },
        options,
    )
    .await
    .map_err(internal("Search failed"))?
    .into_iter()
    .map(db::doc_to_json)
    .collect();

    Ok(Json(json!({ "count": podcasts.len(), "podcasts": podcasts })))
}

pub async fn get_one(State(state): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let not_found = || AppError::not_found("Podcast not found");
    let id = db::oid(&id).ok_or_else(not_found)?;
    let podcast = coll(&state.db, PODCASTS)
        .find_one(doc! { "_id": id }, None)
        .await
        .map_err(internal("Failed to fetch podcast"))?
        .ok_or_else(not_found)?;
    Ok(Json(json!({ "podcast": db::doc_to_json(podcast) })))
}

fn empty_discovery() -> Json<Value> {
    Json(json!({ "source": "itunes", "podcasts": [], "count": 0 }))
}

pub async fn discover(State(state): State<AppState>, Query(params): Params) -> Json<Value> {
    let query = params.get("q").map(String::as_str).unwrap_or_default();
    let limit = match params.get("limit").map(|l| l.trim().parse::<i64>()) {
        None => 20,
        Some(Ok(limit)) if (1..=50).contains(&limit) => limit,
        Some(_) => return empty_discovery(),
    };
    if query.chars().count() < 2 {
        return empty_discovery();
    }

    match itunes::search(&state.http, query, limit as usize).await {
        Ok(results) if !results.is_empty() => {
            return Json(json!({ "source": "itunes", "count": results.len(), "podcasts": results }));
        }
        Ok(_) => tracing::info!("[Discover] iTunes returned 0 results for \"{query}\", trying local DB"),
        Err(err) => tracing::error!("[Discover] iTunes failed for \"{query}\": {err}"),
    }

    // Fallback: podcasts already known locally.
    let pattern = escape_regex(query);
    let filter = doc! { "$or": [
        { "title": { "$regex": pattern.as_str(), "$options": "i" } },
        { "author": { "$regex": pattern.as_str(), "$options": "i" } },
        { "description": { "$regex": pattern.as_str(), "$options": "i" } },
    ] };
    let options = FindOptions::builder().limit(limit).build();
    let local = match find_all(&coll(&state.db, PODCASTS), filter, options).await {
        Ok(local) => local,
        Err(err) => {
            tracing::error!("Discover podcasts error: {err}");
            return empty_discovery();
        }
    };

    let mapped: Vec<Value> = local
        .into_iter()
        .map(|p| {
            let p = db::doc_to_json(p);
            json!({
                "id": p["_id"],
                "title": p["title"],
                "rssUrl": p["rssUrl"],
                "description": p.get("description").cloned().unwrap_or_else(|| json!("")),
                "author": p.get("author").cloned().unwrap_or_else(|| json!("")),
                "imageUrl": p["imageUrl"],
                "episodeCount": p["episodeCount"],
            })
        })
        .collect();

    Json(json!({ "source": "local", "count": mapped.len(), "podcasts": mapped }))
}

pub async fn trending(State(state): State<AppState>, Query(params): Params) -> Json<Value> {
    let limit = num_param(&params, "limit", 20) as usize;
    let genre = params.get("genre").map(String::as_str);
    match itunes::trending(&state.http, limit, genre).await {
        Ok(podcasts) => Json(json!({ "source": "itunes", "count": podcasts.len(), "podcasts": podcasts })),
        Err(err) => {
            tracing::error!("Trending podcasts error: {err}");
            empty_discovery()
        }
    }
}
