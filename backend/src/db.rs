//! MongoDB access. Collection names and document shapes match the former
//! Mongoose models so existing data keeps working after the Rust rewrite.

use std::{collections::HashMap, time::Duration};

use bson::{doc, oid::ObjectId, Bson, Document};
use futures::TryStreamExt;
use mongodb::{
    error::{Error as MongoError, ErrorKind, WriteFailure},
    options::{ClientOptions, FindOptions, IndexOptions},
    Client, Collection, Database, IndexModel,
};
use serde_json::{Map, Value};

pub const USERS: &str = "users";
pub const PODCASTS: &str = "podcasts";
pub const EPISODES: &str = "episodes";
pub const PROGRESS: &str = "userprogresses";
pub const SUBSCRIPTIONS: &str = "usersubscriptions";

pub async fn connect(uri: &str) -> anyhow::Result<Database> {
    let mut options = ClientOptions::parse(uri).await?;
    options.app_name = Some("podcastic".into());
    let client = Client::with_options(options)?;
    let db = client
        .default_database()
        .unwrap_or_else(|| client.database("podcastic"));

    let mut attempt = 1;
    loop {
        match db.run_command(doc! { "ping": 1 }, None).await {
            Ok(_) => break,
            Err(err) if attempt < 15 => {
                tracing::warn!("MongoDB not ready (attempt {attempt}): {err}");
                attempt += 1;
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
            Err(err) => return Err(err.into()),
        }
    }

    ensure_indexes(&db).await;
    tracing::info!("✓ MongoDB connected successfully");
    Ok(db)
}

async fn ensure_indexes(db: &Database) {
    let specs: Vec<(&str, Document, bool)> = vec![
        (USERS, doc! { "email": 1 }, true),
        (PODCASTS, doc! { "rssUrl": 1 }, true),
        (PODCASTS, doc! { "title": "text", "description": "text", "author": "text" }, false),
        (PODCASTS, doc! { "category": 1 }, false),
        (EPISODES, doc! { "podcastId": 1, "guid": 1 }, true),
        (EPISODES, doc! { "podcastId": 1 }, false),
        (EPISODES, doc! { "pubDate": -1 }, false),
        (EPISODES, doc! { "title": "text", "description": "text" }, false),
        (PROGRESS, doc! { "userId": 1, "episodeId": 1 }, true),
        (PROGRESS, doc! { "userId": 1, "lastListenedAt": -1 }, false),
        (SUBSCRIPTIONS, doc! { "userId": 1, "podcastId": 1 }, true),
        (SUBSCRIPTIONS, doc! { "userId": 1, "isFavorite": 1 }, false),
    ];

    for (name, keys, unique) in specs {
        let options = unique.then(|| IndexOptions::builder().unique(true).build());
        let model = IndexModel::builder().keys(keys).options(options).build();
        // Indexes created earlier by Mongoose may differ slightly; that is fine.
        if let Err(err) = coll(db, name).create_index(model, None).await {
            tracing::debug!("Index on {name} skipped: {err}");
        }
    }
}

pub fn coll(db: &Database, name: &str) -> Collection<Document> {
    db.collection::<Document>(name)
}

pub fn oid(value: &str) -> Option<ObjectId> {
    ObjectId::parse_str(value.trim()).ok()
}

pub fn now() -> bson::DateTime {
    bson::DateTime::now()
}

pub fn iso(dt: bson::DateTime) -> String {
    dt.to_chrono()
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

pub async fn find_all(
    collection: &Collection<Document>,
    filter: Document,
    options: impl Into<Option<FindOptions>>,
) -> mongodb::error::Result<Vec<Document>> {
    collection.find(filter, options).await?.try_collect().await
}

pub fn is_duplicate_key(err: &MongoError) -> bool {
    matches!(
        err.kind.as_ref(),
        ErrorKind::Write(WriteFailure::WriteError(write_error)) if write_error.code == 11000
    )
}

/// Converts BSON to the JSON shape Mongoose used to emit
/// (ObjectIds as hex strings, dates as ISO-8601 strings).
pub fn to_json(value: Bson) -> Value {
    match value {
        Bson::ObjectId(id) => Value::String(id.to_hex()),
        Bson::DateTime(dt) => Value::String(iso(dt)),
        Bson::Document(document) => doc_to_json(document),
        Bson::Array(items) => Value::Array(items.into_iter().map(to_json).collect()),
        Bson::String(s) => Value::String(s),
        Bson::Boolean(b) => Value::Bool(b),
        Bson::Int32(i) => Value::from(i),
        Bson::Int64(i) => Value::from(i),
        Bson::Double(f) if f.fract() == 0.0 && f.abs() < 9e15 => Value::from(f as i64),
        Bson::Double(f) => serde_json::Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Bson::Null | Bson::Undefined => Value::Null,
        other => other.into_relaxed_extjson(),
    }
}

pub fn doc_to_json(document: Document) -> Value {
    Value::Object(
        document
            .into_iter()
            .map(|(key, value)| (key, to_json(value)))
            .collect::<Map<String, Value>>(),
    )
}

/// Mongoose-style `populate('podcastId', fields)`: replaces each episode's
/// `podcastId` with the selected podcast fields, or null when missing.
pub async fn populate_podcasts(
    db: &Database,
    episodes: &mut [Document],
    fields: &[&str],
) -> mongodb::error::Result<()> {
    let ids: Vec<ObjectId> = episodes
        .iter()
        .filter_map(|e| e.get_object_id("podcastId").ok())
        .collect();
    if ids.is_empty() {
        return Ok(());
    }

    let mut projection = Document::new();
    for field in fields {
        projection.insert(*field, 1);
    }
    let options = FindOptions::builder().projection(projection).build();
    let podcasts: HashMap<ObjectId, Document> =
        find_all(&coll(db, PODCASTS), doc! { "_id": { "$in": ids } }, options)
            .await?
            .into_iter()
            .filter_map(|p| Some((p.get_object_id("_id").ok()?, p)))
            .collect();

    for episode in episodes.iter_mut() {
        let populated = episode
            .get_object_id("podcastId")
            .ok()
            .and_then(|id| podcasts.get(&id).cloned())
            .map(Bson::Document)
            .unwrap_or(Bson::Null);
        episode.insert("podcastId", populated);
    }
    Ok(())
}
