# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

# Build with /api as the API base URL (served by Express on same host)
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Copy backend production deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy compiled backend
COPY --from=backend-builder /app/dist ./dist

# Copy frontend build into public/ (backend will serve it as static files)
COPY --from=frontend-builder /frontend/dist ./public

# Run as non-root for defense in depth — node:alpine ships a "node" user (uid 1000)
RUN chown -R node:node /app
USER node

EXPOSE 3579

ENV NODE_ENV=production
ENV PORT=3579

CMD ["node", "dist/index.js"]
