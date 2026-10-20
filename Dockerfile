# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python & All-In-One Server
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code & docs
COPY backend/ ./
COPY docs/ /app/docs/

# Copy built React frontend into /app/static
COPY --from=frontend-builder /build/dist ./static

# Ensure data and uploads directories exist
RUN mkdir -p /app/data /app/uploads

ENV PORT=8090
EXPOSE 8090

# Seed demo data if database is new, then start FastAPI server
CMD ["sh", "-c", "python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
