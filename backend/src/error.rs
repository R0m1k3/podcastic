use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

/// API error rendered as a JSON body (`{ "message": ... }` by default).
#[derive(Debug)]
pub struct AppError {
    pub status: StatusCode,
    pub body: Value,
}

impl AppError {
    pub fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            body: json!({ "message": message.into() }),
        }
    }

    pub fn with_body(status: StatusCode, body: Value) -> Self {
        Self { status, body }
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(StatusCode::BAD_REQUEST, message)
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(StatusCode::NOT_FOUND, message)
    }

    pub fn validation(errors: Vec<Value>) -> Self {
        Self::with_body(
            StatusCode::BAD_REQUEST,
            json!({ "message": "Validation error", "errors": errors }),
        )
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.status, Json(self.body)).into_response()
    }
}

pub type ApiResult<T = Json<Value>> = Result<T, AppError>;

/// Logs the underlying error and maps it to a 500 carrying `message`.
pub fn internal<E: std::fmt::Display>(message: &'static str) -> impl FnOnce(E) -> AppError {
    move |err| {
        tracing::error!("{message}: {err}");
        AppError::new(StatusCode::INTERNAL_SERVER_ERROR, message)
    }
}

/// Builds a zod-like validation issue.
pub fn issue(field: &str, message: &str) -> Value {
    json!({ "path": [field], "message": message })
}
