#!/bin/bash
set -e

echo "==============================================="
echo "   Universal Voting Platform - Docker 极速部署"
echo "==============================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: 未检测到 Docker，请先安装 Docker 和 Docker Compose"
    exit 1
fi

echo "[1/2] 构建镜像并启动容器 (端口 127.0.0.1:8090)..."
docker compose up -d --build

echo "[2/2] 检查容器运行状态..."
sleep 3
docker compose ps

echo "==============================================="
echo "   部署成功！服务已运行在: http://127.0.0.1:8090"
echo "   管理后台账号: admin  密码: password123"
echo "   短视频竞赛链接: /v/video001"
echo "==============================================="
