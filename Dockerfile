# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# 使用国内淘宝/npmmirror镜像源加速
RUN npm config set registry https://registry.npmmirror.com

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python & All-In-One Server
# ==========================================
FROM python:3.11-slim

WORKDIR /app

# 替换为清华大学 Debian 镜像源并安装 ffmpeg（用于服务端视频 +faststart 首帧秒开流式优化）
RUN sed -i 's/deb.debian.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apt/sources.list.d/debian.sources && \
    apt-get update && apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Python依赖全部具备预编译二进制wheel包，无需缓慢的 gcc 编译！
COPY backend/requirements.txt ./

# 使用清华大学开源镜像源加速 pip 安装
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt

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
