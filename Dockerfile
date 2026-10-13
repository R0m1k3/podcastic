# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Build with /api as the API base URL (served by the Rust backend on same host)
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Build Rust backend
FROM rust:1-bookworm AS backend-builder

WORKDIR /app

# Cache dependencies separately from sources
COPY backend/Cargo.toml backend/Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release \
    && rm -rf src

COPY backend/src ./src
RUN touch src/main.rs && cargo build --release

# Stage 3: Production image
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home podcastic

WORKDIR /app

COPY --from=backend-builder /app/target/release/podcastic ./podcastic
COPY --from=frontend-builder /frontend/dist ./public

USER podcastic

EXPOSE 3579

ENV PORT=3579
ENV PUBLIC_DIR=/app/public
ENV RUST_LOG=podcastic=info,tower_http=warn

CMD ["/app/podcastic"]
