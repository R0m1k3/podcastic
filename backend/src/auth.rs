use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
    Json,
};
use bson::{doc, oid::ObjectId, Bson, Document};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{
    db::{self, coll, USERS},
    error::{internal, issue, ApiResult, AppError},
    AppState,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub id: String,
    pub email: String,
    pub iat: i64,
    pub exp: i64,
}

pub struct JwtConfig {
    encoding: EncodingKey,
    decoding: DecodingKey,
    access_ttl: i64,
    refresh_ttl: i64,
}

impl JwtConfig {
    pub fn new(secret: &str, access_ttl: &str, refresh_ttl: &str) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret.as_bytes()),
            decoding: DecodingKey::from_secret(secret.as_bytes()),
            access_ttl: parse_ttl(access_ttl).unwrap_or(7 * 86_400),
            refresh_ttl: parse_ttl(refresh_ttl).unwrap_or(30 * 86_400),
        }
    }

    fn sign(&self, id: &str, email: &str, ttl: i64) -> jsonwebtoken::errors::Result<String> {
        let iat = chrono::Utc::now().timestamp();
        let claims = Claims {
            id: id.to_owned(),
            email: email.to_owned(),
            iat,
            exp: iat + ttl,
        };
        encode(&Header::new(Algorithm::HS256), &claims, &self.encoding)
    }

    pub fn issue_pair(&self, id: &str, email: &str) -> jsonwebtoken::errors::Result<(String, String)> {
        Ok((
            self.sign(id, email, self.access_ttl)?,
            self.sign(id, email, self.refresh_ttl)?,
        ))
    }

    pub fn verify(&self, token: &str) -> Option<Claims> {
        decode::<Claims>(token, &self.decoding, &Validation::new(Algorithm::HS256))
            .ok()
            .map(|data| data.claims)
    }
}

/// Parses `vercel/ms`-style durations used in env vars ("7d", "12h", "30m", "3600").
fn parse_ttl(value: &str) -> Option<i64> {
    let value = value.trim();
    let split = value
        .find(|c: char| !c.is_ascii_digit())
        .unwrap_or(value.len());
    let (amount, unit) = value.split_at(split);
    let amount: i64 = amount.parse().ok()?;
    let factor = match unit.trim() {
        "" | "s" => 1,
        "m" => 60,
        "h" => 3_600,
        "d" => 86_400,
        "w" => 604_800,
        "y" => 31_557_600,
        _ => return None,
    };
    Some(amount * factor)
}

/// Authenticated user extracted from the `Authorization: Bearer` header.
pub struct AuthUser {
    pub id: ObjectId,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or_else(|| AppError::unauthorized("Missing or invalid authorization header"))?;

        state
            .jwt
            .verify(token)
            .and_then(|claims| db::oid(&claims.id))
            .map(|id| AuthUser { id })
            .ok_or_else(|| AppError::unauthorized("Invalid or expired token"))
    }
}

/// Like [`AuthUser`] but never rejects the request.
pub struct MaybeUser(pub Option<AuthUser>);

#[async_trait]
impl FromRequestParts<AppState> for MaybeUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, AppError> {
        Ok(MaybeUser(AuthUser::from_request_parts(parts, state).await.ok()))
    }
}

fn str_field(body: &Value, key: &str) -> String {
    body.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}

fn is_valid_email(email: &str) -> bool {
    let Some((local, domain)) = email.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !email.chars().any(char::is_whitespace)
}

fn user_json(mut user: Document) -> Value {
    user.remove("password");
    db::doc_to_json(user)
}

fn auth_response(state: &AppState, user: Document, message: &str) -> ApiResult<Value> {
    let id = user
        .get_object_id("_id")
        .map_err(internal("Authentication failed"))?
        .to_hex();
    let email = user.get_str("email").unwrap_or_default().to_owned();
    let (access_token, refresh_token) = state
        .jwt
        .issue_pair(&id, &email)
        .map_err(internal("Authentication failed"))?;

    Ok(json!({
        "message": message,
        "user": user_json(user),
        "tokens": { "accessToken": access_token, "refreshToken": refresh_token },
    }))
}

pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<Value>,
) -> ApiResult<(StatusCode, Json<Value>)> {
    let email = str_field(&body, "email");
    let password = str_field(&body, "password");
    let username = str_field(&body, "username");

    let mut errors = Vec::new();
    if !is_valid_email(email.trim()) {
        errors.push(issue("email", "Invalid email address"));
    }
    if password.chars().count() < 6 {
        errors.push(issue("password", "Password must be at least 6 characters"));
    }
    if username.chars().count() < 2 {
        errors.push(issue("username", "Username must be at least 2 characters"));
    }
    if !errors.is_empty() {
        return Err(AppError::validation(errors));
    }

    let email = email.trim().to_lowercase();
    let users = coll(&state.db, USERS);
    let existing = users
        .find_one(doc! { "email": email.as_str() }, None)
        .await
        .map_err(internal("Registration failed"))?;
    if existing.is_some() {
        return Err(AppError::new(StatusCode::CONFLICT, "Email already registered"));
    }

    let hash = tokio::task::spawn_blocking(move || bcrypt::hash(password, 10))
        .await
        .map_err(internal("Registration failed"))?
        .map_err(internal("Registration failed"))?;

    let now = db::now();
    let mut user = doc! {
        "email": email.as_str(),
        "password": hash,
        "username": username.trim(),
        "avatar": Bson::Null,
        "preferences": { "defaultPlaybackSpeed": 1, "theme": "light", "language": "en" },
        "createdAt": now,
        "updatedAt": now,
        "__v": 0,
    };
    let inserted = users.insert_one(&user, None).await.map_err(|err| {
        if db::is_duplicate_key(&err) {
            AppError::new(StatusCode::CONFLICT, "Email already registered")
        } else {
            internal("Registration failed")(err)
        }
    })?;
    user.insert("_id", inserted.inserted_id);

    let body = auth_response(&state, user, "User registered successfully")?;
    Ok((StatusCode::CREATED, Json(body)))
}

pub async fn login(State(state): State<AppState>, Json(body): Json<Value>) -> ApiResult {
    let email = str_field(&body, "email");
    let password = str_field(&body, "password");

    let mut errors = Vec::new();
    if !is_valid_email(email.trim()) {
        errors.push(issue("email", "Invalid email address"));
    }
    if password.is_empty() {
        errors.push(issue("password", "Password required"));
    }
    if !errors.is_empty() {
        return Err(AppError::validation(errors));
    }

    let invalid = || AppError::unauthorized("Invalid email or password");
    let user = coll(&state.db, USERS)
        .find_one(doc! { "email": email.trim().to_lowercase() }, None)
        .await
        .map_err(internal("Login failed"))?
        .ok_or_else(invalid)?;

    let hash = user.get_str("password").unwrap_or_default().to_owned();
    let valid = tokio::task::spawn_blocking(move || bcrypt::verify(password, &hash).unwrap_or(false))
        .await
        .map_err(internal("Login failed"))?;
    if !valid {
        return Err(invalid());
    }

    Ok(Json(auth_response(&state, user, "Login successful")?))
}

pub async fn me(State(state): State<AppState>, user: AuthUser) -> ApiResult {
    let user = coll(&state.db, USERS)
        .find_one(doc! { "_id": user.id }, None)
        .await
        .map_err(internal("Failed to fetch user"))?
        .ok_or_else(|| AppError::not_found("User not found"))?;
    Ok(Json(json!({ "user": user_json(user) })))
}

pub async fn logout(_user: AuthUser) -> Json<Value> {
    // Stateless JWT: the client simply drops its tokens.
    Json(json!({ "message": "Logout successful" }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ttl() {
        assert_eq!(parse_ttl("7d"), Some(604_800));
        assert_eq!(parse_ttl("15m"), Some(900));
        assert_eq!(parse_ttl("3600"), Some(3600));
        assert_eq!(parse_ttl("abc"), None);
    }

    #[test]
    fn round_trips_tokens() {
        let jwt = JwtConfig::new("secret", "7d", "30d");
        let (access, _) = jwt.issue_pair("65f000000000000000000000", "a@b.co").unwrap();
        let claims = jwt.verify(&access).unwrap();
        assert_eq!(claims.email, "a@b.co");
        assert!(jwt.verify("garbage").is_none());
    }

    #[test]
    fn validates_email() {
        assert!(is_valid_email("john@example.com"));
        assert!(!is_valid_email("john@example"));
        assert!(!is_valid_email("john.example.com"));
    }
}
