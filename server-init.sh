#!/bin/bash
# 服务器初始化部署脚本
# 在服务器上以 root 身份执行一次

set -e

REPO_URL="$1"  # 第一个参数：GitHub 仓库地址

if [ -z "$REPO_URL" ]; then
    echo "用法: bash server-init.sh https://github.com/你的用户名/aihub.git"
    exit 1
fi

echo "=== 1. 安装依赖 ==="
which git || apt-get install -y git
which node || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)

echo "=== 2. Clone 仓库 ==="
if [ -d /www/aihub ]; then
    echo "/www/aihub 已存在，跳过 clone"
else
    git clone "$REPO_URL" /www/aihub
fi

echo "=== 3. 复制后端 .env 配置 ==="
if [ -f /www/aihub-backend/.env ]; then
    cp /www/aihub-backend/.env /www/aihub/backend/.env
    echo "已从旧路径复制 .env"
else
    echo "⚠️  请手动创建 /www/aihub/backend/.env"
fi

echo "=== 4. 更新 systemd 服务（指向新路径）==="
cat > /etc/systemd/system/aihub.service << 'EOF'
[Unit]
Description=AIHub FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/www/aihub/backend
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart aihub
systemctl status aihub --no-pager

echo "=== 5. 构建前端 ==="
cd /www/aihub
npm ci
npm run build
rsync -av --delete dist/ /www/aihub-frontend/

echo "=== 完成！==="
echo "旧的 /www/aihub-backend 目录可以在确认正常后删除"
