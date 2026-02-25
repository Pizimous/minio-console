# 构建前端
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --registry=https://registry.npmmirror.com
COPY . .
RUN npm run build

# 最终镜像
FROM node:20-alpine
WORKDIR /app

# 复制后端代码和package.json
COPY server/package*.json ./
COPY server/server.js ./server.js

# 安装后端依赖
RUN npm ci --registry=https://registry.npmmirror.com --omit=dev

# 复制前端构建产物
COPY --from=frontend-builder /app/dist ./public

EXPOSE 3001

CMD ["node", "server.js"]
