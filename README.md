# MinIO Console

A modern web-based MinIO management console for managing buckets and files with a clean, intuitive UI.

![Preview](https://via.placeholder.com/800x450?text=MinIO+Console+Preview)

## ✨ Features

- **Bucket Management** - Create, delete, and manage storage buckets
- **Access Control** - Set bucket policies (private, public-read, public-read-write)
- **File Browser** - Browse, upload, download, and delete objects
- **Image Preview** - Preview images directly in the browser
- **Connection Config** - Easy configuration for MinIO server credentials

## 🛠️ Tech Stack

- React 19
- Vite 7
- TypeScript
- Lucide React (icons)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MinIO Server

### Installation

```bash
# Clone the repository
git clone https://github.com/Pizimous/minio-console.git
cd minio-console

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🐳 Docker Deployment

```bash
# Build the image
docker build -t minio-console .

# Run the container
docker run -d -p 3000:80 minio-console
```

Or use docker-compose:

```bash
docker-compose up -d
```

## 📦 Project Structure

```
minio-console/
├── src/
│   ├── components/
│   │   ├── BucketManager.jsx    # Bucket CRUD & permissions
│   │   ├── ConnectionConfig.jsx # MinIO connection settings
│   │   ├── FileBrowser.jsx      # File/folder browser
│   │   └── ImagePreview.jsx     # Image preview component
│   ├── services/
│   │   └── api.js               # MinIO API client
│   ├── App.jsx                  # Main application
│   └── main.jsx                 # Entry point
├── server/
│   └── server.js                # Simple proxy server
├── public/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## 🔧 Configuration

The console connects to your MinIO server via a simple proxy server. Configure the connection in the web UI:

- **Endpoint**: Your MinIO server address (e.g., localhost:9000)
- **Access Key**: MinIO access key
- **Secret Key**: MinIO secret key

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️
