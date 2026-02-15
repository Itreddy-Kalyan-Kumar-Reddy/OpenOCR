# ============================================
# BillScan AI — Multi-stage Docker Build
# Backend (FastAPI + EasyOCR) + Frontend (React)
# ============================================

# ---- Stage 1: Build React Frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY client/ ./
RUN npm run build


# ---- Stage 2: Production Server ----
FROM python:3.11-slim

# System deps for EasyOCR (OpenCV, libGL) and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY server/ ./server/

# Copy built frontend into static serving
COPY --from=frontend-build /app/client/dist ./client/dist

# Create data directories
RUN mkdir -p /app/server/uploads /app/server/exports /app/data

# Environment
ENV PYTHONUNBUFFERED=1
ENV BILLSCAN_SECRET_KEY=change-me-in-production
ENV DATABASE_URL=sqlite:////app/data/billscan.db

EXPOSE 3001

WORKDIR /app/server

CMD ["python", "main.py"]
