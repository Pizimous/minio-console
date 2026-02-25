#!/bin/bash
# 部署脚本 - 在本地执行

SERVER="10.10.7.99"
USER="root"
REMOTE_DIR="/opt/minio-console"

echo "=== 打包项目文件 ==="
tar -czf minio-console.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='server/node_modules' \
    -C .. minio-console

echo "=== 上传到服务器 ==="
scp minio-console.tar.gz ${USER}@${SERVER}:/tmp/

echo "=== 在服务器上部署 ==="
ssh ${USER}@${SERVER} << 'EOF'
cd /tmp
rm -rf /opt/minio-console
mkdir -p /opt/minio-console
tar -xzf minio-console.tar.gz -C /opt/
cd /opt/minio-console

echo "=== 构建并启动Docker容器 ==="
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "=== 清理 ==="
rm -f /tmp/minio-console.tar.gz

echo "=== 部署完成 ==="
docker ps | grep minio-console
EOF

rm -f minio-console.tar.gz
echo "本地清理完成，服务已部署到 http://${SERVER}:3001"
