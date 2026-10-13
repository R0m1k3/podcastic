use std::collections::HashMap;

use axum::{
    extract::{Path, Query, State},
    Json,
};
use bson::{doc, oid::ObjectId, Bson, Document};
use mongodb::options::{FindOneAndUpdateOptions, FindOptions, ReturnDocument};
use serde_json::{json, Value};

use crate::{
    auth::{AuthUser, MaybeUser},
    db::{self, coll, find_all, populate_podcasts, EPISODES, PROGRESS, SUBSCRIPTIONS},
    error::{internal, ApiResult, AppError},
    podcasts::num_param,
    AppState,
};

type Params = Query<HashMap<String, String>>;

const LIST_FIELDS: &[&str] = &["title", "author", "imageUrl"];

/// Serializes episodes, adding `progress: { position, isCompleted } | null` for `user`.
async fn with_progress(
    state: &AppState,
    user: Option<&AuthUser>,
    episodes: Vec<Document>,
) -> mongodb::error::Result<Vec<Value>> {
    let Some(user) = user else {
        return Ok(episodes.into_iter().map(db::doc_to_json).collect());
    };

    let ids: Vec<ObjectId> = episodes
        .iter()
        .filter_map(|e| e.get_object_id("_id").ok())
        .collect();
    let progress: HashMap<ObjectId, Value> = find_all(
        &coll(&state.db, PROGRESS),
        doc! { "userId": user.id, "episodeId": { "$in": ids } },
        None,
    )
    .await?
    .into_iter()
    .filter_map(|p| {
        let id = p.get_object_id("episodeId").ok()?;
        let position = p.get("position").cloned().map(db::to_json).unwrap_or(json!(0));
        let completed = p.get_bool("isCompleted").unwrap_or(false);
        Some((id, json!({ "position": position, "isCompleted": completed })))
    })
    .collect();

    Ok(episodes
        .into_iter()
        .map(|episode| {
            let entry = episode
                .get_object_id("_id")
                .ok()
                .and_then(|id| progress.get(&id).cloned())
                .unwrap_or(Value::Null);
            let mut value = db::doc_to_json(episode);
            value["progress"] = entry;
            value
        })
        .collect())
}

fn list_options(params: &HashMap<String, String>, default_limit: i64, sort: Document) -> FindOptions {
    FindOptions::builder()
        .sort(sort)
        .skip(num_param(params, "skip", 0) as u64)
        .limit(num_param(params, "limit", default_limit))
        .build()
}

pub async fn latest(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Params,
) -> ApiResult {
    const ERR: &str = "Failed to fetch episodes";
    let podcast_ids: Vec<Bson> = find_all(&coll(&state.db, SUBSCRIPTIONS), doc! { "userId": user.id }, None)
        .await
        .map_err(internal(ERR))?
        .into_iter()
        .filter_map(|s| s.get("podcastId").cloned())
        .collect();
    if podcast_ids.is_empty() {
        return Ok(Json(json!({ "episodes": [], "count": 0 })));
    }

    let options = list_options(&params, 30, doc! { "pubDate": -1 });
    let mut episodes = find_all(
        &coll(&state.db, EPISODES),
        doc! { "podcastId": { "$in": podcast_ids } },
        options,
    )
    .await
    .map_err(internal(ERR))?;
    populate_podcasts(&state.db, &mut episodes, LIST_FIELDS)
        .await
        .map_err(internal(ERR))?;
    let episodes = with_progress(&state, Some(&user), episodes)
        .await
        .map_err(internal(ERR))?;

    Ok(Json(json!({ "count": episodes.len(), "episodes": episodes })))
}

pub async fn for_podcast(
    State(state): State<AppState>,
    MaybeUser(user): MaybeUser,
    Path(podcast_id): Path<String>,
    Query(params): Params,
) -> ApiResult {
    const ERR: &str = "Failed to fetch episodes";
    let Some(podcast_id) = db::oid(&podcast_id) else {
        return Ok(Json(json!({ "episodes": [], "count": 0 })));
    };
    let options = list_options(&params, 50, doc! { "pubDate": -1 });
    let episodes = find_all(&coll(&state.db, EPISODES), doc! { "podcastId": podcast_id }, options)
        .await
        .map_err(internal(ERR))?;
    let episodes = with_progress(&state, user.as_ref(), episodes)
        .await
        .map_err(internal(ERR))?;

    Ok(Json(json!({ "count": episodes.len(), "episodes": episodes })))
}

pub async fn get_one(State(state): State<AppState>, Path(id): Path<String>) -> ApiResult {
    const ERR: &str = "Failed to fetch episode";
    let not_found = || AppError::not_found("Episode not found");
    let id = db::oid(&id).ok_or_else(not_found)?;
    let episode = coll(&state.db, EPISODES)
        .find_one(doc! { "_id": id }, None)
        .await
        .map_err(internal(ERR))?
        .ok_or_else(not_found)?;

    let mut episodes = vec![episode];
    populate_podcasts(&state.db, &mut episodes, &["title", "author", "description", "imageUrl"])
        .await
        .map_err(internal(ERR))?;
    let episode = episodes.pop().map(db::doc_to_json);
    Ok(Json(json!({ "episode": episode })))
}

pub async fn save_progress(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<Value>,
) -> ApiResult {
    let episode_id = body.get("episodeId").and_then(Value::as_str).unwrap_or_default();
    let position = body.get("position").and_then(Value::as_f64);
    let (Some(position), false) = (position, episode_id.is_empty()) else {
        return Err(AppError::bad_request("Episode ID and position required"));
    };
    let episode_id = db::oid(episode_id).ok_or_else(|| AppError::bad_request("Invalid episode ID"))?;
    let is_completed = body.get("isCompleted").and_then(Value::as_bool);

    let now = db::now();
    let mut set = doc! { "position": position.max(0.0), "lastListenedAt": now, "updatedAt": now };
    let mut on_insert = doc! { "isSaved": false, "createdAt": now, "__v": 0 };
    match is_completed {
        Some(completed) => set.insert("isCompleted", completed),
        None => on_insert.insert("isCompleted", false),
    };

    let options = FindOneAndUpdateOptions::builder()
        .upsert(true)
        .return_document(ReturnDocument::After)
        .build();
    let progress = coll(&state.db, PROGRESS)
        .find_one_and_update(
            doc! { "userId": user.id, "episodeId": episode_id },
            doc! { "$set": set, "$setOnInsert": on_insert },
            options,
        )
        .await
        .map_err(internal("Failed to save progress"))?;

    Ok(Json(json!({
        "message": "Progress saved",
        "progress": progress.map(db::doc_to_json),
    })))
}

pub async fn get_progress(
    State(state): State<AppState>,
    user: AuthUser,
    Path(episode_id): Path<String>,
) -> ApiResult {
    let none = || Json(json!({ "progress": null, "message": "No progress found" }));
    let Some(episode_id) = db::oid(&episode_id) else {
        return Ok(none());
    };
    let progress = coll(&state.db, PROGRESS)
        .find_one(doc! { "userId": user.id, "episodeId": episode_id }, None)
        .await
        .map_err(internal("Failed to fetch progress"))?;

    Ok(match progress {
        Some(progress) => Json(json!({ "progress": db::doc_to_json(progress) })),
        None => none(),
    })
}

pub async fn search(
    State(state): State<AppState>,
    user: AuthUser,
    Query(params): Params,
) -> ApiResult {
    const ERR: &str = "Search failed";
    let query = params.get("q").map(String::as_str).unwrap_or_default();
    if query.is_empty() {
        return Err(AppError::bad_request("Search query required"));
    }

    let score = doc! { "score": { "$meta": "textScore" } };
    let mut options = list_options(&params, 40, score.clone());
    options.projection = Some(score);
    let mut episodes = find_all(
        &coll(&state.db, EPISODES),
        doc! { "$text": { "$search": query } },
        options,
    )
    .await
    .map_err(internal(ERR))?;
    populate_podcasts(&state.db, &mut episodes, LIST_FIELDS)
        .await
        .map_err(internal(ERR))?;
    let episodes = with_progress(&state, Some(&user), episodes)
        .await
        .map_err(internal(ERR))?;

    Ok(Json(json!({ "count": episodes.len(), "episodes": episodes })))
}
