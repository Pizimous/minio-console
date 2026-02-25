# MinIO Console

一个现代化的 MinIO 管理控制台，提供简洁直观的界面来管理存储桶和文件。

![预览图](https://via.placeholder.com/800x450?text=MinIO+Console+Preview)

## ✨ 功能特性

- **存储桶管理** - 创建、删除和管理存储桶
- **访问控制** - 设置存储桶权限（私有、公共读、公共读写）
- **文件浏览器** - 浏览、上传、下载和删除对象
- **图片预览** -直接在浏览器中预览图片
- **连接配置** - 轻松配置 MinIO 服务器凭据

## 🛠️ 技术栈

- React 19
- Vite 7
- TypeScript
- Lucide React (图标)

## 🚀 快速开始

### 前置要求

- Node.js 18+
- MinIO 服务器

### 安装

```bash
# 克隆仓库
git clone https://github.com/Pizimous/minio-console.git
cd minio-console

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 生产环境构建

```bash
npm run build
```

## 🐳 Docker 部署

```bash
# 构建镜像
docker build -t minio-console .

# 运行容器
docker run -d -p 3000:80 minio-console
```

或使用 docker-compose：

```bash
docker-compose up -d
```

## 📦 项目结构

```
minio-console/
├── src/
│   ├── components/
│   │   ├── BucketManager.jsx    # 存储桶 CRUD 和权限管理
│   │   ├── ConnectionConfig.jsx # MinIO 连接配置
│   │   ├── FileBrowser.jsx      # 文件/文件夹浏览器
│   │   └── ImagePreview.jsx     # 图片预览组件
│   ├── services/
│   │   └── api.js               # MinIO API 客户端
│   ├── App.jsx                  # 主应用
│   └── main.jsx                 # 入口文件
├── server/
│   └── server.js                # 简单的代理服务器
├── public/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 配置

控制台通过简单的代理服务器连接到你的 MinIO 服务器。在网页界面中配置连接：

- **Endpoint**: MinIO 服务器地址（如 localhost:9000）
- **Access Key**: MinIO 访问密钥
- **Secret Key**: MinIO 秘密密钥

## 📄 开源许可

MIT License - 详见 [LICENSE](LICENSE)。

---

用 ❤️ 构建
