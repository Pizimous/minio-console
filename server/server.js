const express = require('express');
const cors = require('cors');
const Minio = require('minio');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 静态文件服务（生产环境）
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// 存储MinIO客户端实例
let minioClient = null;
let currentConfig = null;

// 测试连接
app.post('/api/connect', async (req, res) => {
  try {
    const { endPoint, port, accessKey, secretKey, useSSL } = req.body;
    
    const client = new Minio.Client({
      endPoint,
      port: parseInt(port) || 9000,
      useSSL: useSSL || false,
      accessKey,
      secretKey
    });

    // 测试连接 - 尝试列出buckets
    await client.listBuckets();
    
    minioClient = client;
    currentConfig = { endPoint, port, accessKey, secretKey, useSSL };
    
    res.json({ success: true, message: '连接成功' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 断开连接
app.post('/api/disconnect', (req, res) => {
  minioClient = null;
  currentConfig = null;
  res.json({ success: true });
});

// 获取当前连接状态
app.get('/api/status', (req, res) => {
  res.json({
    connected: !!minioClient,
    config: currentConfig ? {
      endPoint: currentConfig.endPoint,
      port: currentConfig.port,
      useSSL: currentConfig.useSSL
    } : null
  });
});

// 中间件：检查连接
const requireConnection = (req, res, next) => {
  if (!minioClient) {
    return res.status(401).json({ error: '未连接到MinIO服务器' });
  }
  next();
};

// 列出所有桶
app.get('/api/buckets', requireConnection, async (req, res) => {
  try {
    const buckets = await minioClient.listBuckets();
    res.json(buckets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建桶
app.post('/api/buckets', requireConnection, async (req, res) => {
  try {
    const { bucketName, region } = req.body;
    await minioClient.makeBucket(bucketName, region || 'us-east-1');
    res.json({ success: true, message: `桶 ${bucketName} 创建成功` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除桶
app.delete('/api/buckets/:bucketName', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    await minioClient.removeBucket(bucketName);
    res.json({ success: true, message: `桶 ${bucketName} 删除成功` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取桶策略
app.get('/api/buckets/:bucketName/policy', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const policy = await minioClient.getBucketPolicy(bucketName);
    res.json({ policy: policy || '' });
  } catch (error) {
    // 如果没有策略，返回空
    if (error.code === 'NoSuchBucketPolicy') {
      return res.json({ policy: '' });
    }
    res.status(500).json({ error: error.message });
  }
});

// 设置桶策略
app.put('/api/buckets/:bucketName/policy', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { policy } = req.body;
    
    if (policy) {
      await minioClient.setBucketPolicy(bucketName, policy);
    } else {
      // 删除策略（设置为私有）
      await minioClient.setBucketPolicy(bucketName, '');
    }
    
    res.json({ success: true, message: '策略更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 设置预定义策略
app.put('/api/buckets/:bucketName/access', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { access } = req.body; // 'private', 'public-read', 'public-read-write'
    
    let policy = '';
    
    if (access === 'public-read') {
      policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }]
      });
    } else if (access === 'public-read-write') {
      policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }]
      });
    }
    
    await minioClient.setBucketPolicy(bucketName, policy);
    res.json({ success: true, message: '访问权限更新成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 列出桶内文件
app.get('/api/buckets/:bucketName/objects', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { prefix = '', recursive = 'false' } = req.query;
    
    const objects = [];
    const stream = minioClient.listObjectsV2(bucketName, prefix, recursive === 'true');
    
    stream.on('data', (obj) => {
      objects.push(obj);
    });
    
    stream.on('end', () => {
      res.json(objects);
    });
    
    stream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传文件
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/buckets/:bucketName/upload', requireConnection, upload.single('file'), async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { prefix = '' } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: '未提供文件' });
    }
    
    const objectName = prefix ? `${prefix}${file.originalname}` : file.originalname;
    
    await minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype }
    );
    
    res.json({ success: true, objectName, message: '文件上传成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 下载文件
app.get('/api/buckets/:bucketName/download/*objectName', requireConnection, async (req, res) => {
  try {
    const { bucketName, objectName } = req.params;
    
    const stat = await minioClient.statObject(bucketName, objectName);
    const stream = await minioClient.getObject(bucketName, objectName);
    
    res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(objectName)}"`);
    
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 预览文件（不下载）
app.get('/api/preview/:bucketName/*objectName', requireConnection, async (req, res) => {
  try {
    const { bucketName, objectName } = req.params;
    
    const stat = await minioClient.statObject(bucketName, objectName);
    const stream = await minioClient.getObject(bucketName, objectName);
    
    const contentType = stat.metaData['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除文件
app.delete('/api/buckets/:bucketName/delete/*objectName', requireConnection, async (req, res) => {
  try {
    const { bucketName, objectName } = req.params;
    await minioClient.removeObject(bucketName, objectName);
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量删除文件
app.post('/api/buckets/:bucketName/delete-objects', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { objects } = req.body;
    
    await minioClient.removeObjects(bucketName, objects);
    res.json({ success: true, message: `已删除 ${objects.length} 个文件` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取文件信息
app.get('/api/buckets/:bucketName/stat/*objectName', requireConnection, async (req, res) => {
  try {
    const { bucketName, objectName } = req.params;
    const stat = await minioClient.statObject(bucketName, objectName);
    res.json(stat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 生成预签名URL
app.get('/api/buckets/:bucketName/presigned/*objectName', requireConnection, async (req, res) => {
  try {
    const { bucketName, objectName } = req.params;
    const { expiry = 3600 } = req.query;
    
    const url = await minioClient.presignedGetObject(bucketName, objectName, parseInt(expiry));
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量生成预签名URL
app.post('/api/buckets/:bucketName/presigned-batch', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { objects, expiry = 3600 } = req.body;
    
    const results = {};
    await Promise.all(
      objects.map(async (objectName) => {
        try {
          const url = await minioClient.presignedGetObject(bucketName, objectName, parseInt(expiry));
          results[objectName] = url;
        } catch (err) {
          results[objectName] = null;
        }
      })
    );
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建文件夹（通过创建空对象）
app.post('/api/buckets/:bucketName/folder', requireConnection, async (req, res) => {
  try {
    const { bucketName } = req.params;
    const { folderName } = req.body;
    
    const objectName = folderName.endsWith('/') ? folderName : `${folderName}/`;
    await minioClient.putObject(bucketName, objectName, Buffer.alloc(0));
    
    res.json({ success: true, message: '文件夹创建成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA路由回退（生产环境）
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MinIO Console Server running on port ${PORT}`);
});
