import axios from 'axios';

// 生产环境使用相对路径，开发环境使用localhost
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000  // 缩短超时时间到15秒
});

// 连接管理
export const connect = (config) => api.post('/connect', config);
export const disconnect = () => api.post('/disconnect');
export const getStatus = () => api.get('/status');

// 桶管理
export const listBuckets = () => api.get('/buckets');
export const createBucket = (bucketName, region) => api.post('/buckets', { bucketName, region });
export const deleteBucket = (bucketName) => api.delete(`/buckets/${bucketName}`);
export const getBucketPolicy = (bucketName) => api.get(`/buckets/${bucketName}/policy`);
export const setBucketPolicy = (bucketName, policy) => api.put(`/buckets/${bucketName}/policy`, { policy });
export const setBucketAccess = (bucketName, access) => api.put(`/buckets/${bucketName}/access`, { access });

// 文件管理
export const listObjects = (bucketName, prefix = '', recursive = false) => 
  api.get(`/buckets/${bucketName}/objects`, { params: { prefix, recursive } });

export const uploadFile = (bucketName, file, prefix = '', onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prefix', prefix);
  
  return api.post(`/buckets/${bucketName}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  });
};

export const deleteObject = (bucketName, objectName) => 
  api.delete(`/buckets/${bucketName}/delete/${objectName}`);

export const deleteObjects = (bucketName, objects) => 
  api.post(`/buckets/${bucketName}/delete-objects`, { objects });

export const getObjectStat = (bucketName, objectName) => 
  api.get(`/buckets/${bucketName}/stat/${objectName}`);

export const getPresignedUrl = (bucketName, objectName, expiry = 3600) => 
  api.get(`/buckets/${bucketName}/presigned/${objectName}`, { params: { expiry } });

// 批量获取预签名URL
export const getPresignedUrls = (bucketName, objects, expiry = 3600) => 
  api.post(`/buckets/${bucketName}/presigned-batch`, { objects, expiry });

export const createFolder = (bucketName, folderName) => 
  api.post(`/buckets/${bucketName}/folder`, { folderName });

// 预览URL
export const getPreviewUrl = (bucketName, objectName) => 
  `${API_BASE}/preview/${bucketName}/${objectName}`;

// 下载URL
export const getDownloadUrl = (bucketName, objectName) => 
  `${API_BASE}/buckets/${bucketName}/download/${objectName}`;

export default api;
