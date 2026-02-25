import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, FolderOpen, File, Image, FileText, Film, Music,
  Upload, Download, Trash2, Plus, RefreshCw, Loader2, X,
  ChevronRight, Eye, Copy, Check, Grid, List
} from 'lucide-react';
import {
  listObjects, uploadFile, deleteObjects,
  createFolder, getPresignedUrl, getPresignedUrls
} from '../services/api';
import ImagePreview from './ImagePreview';
import './FileBrowser.css';

const FILE_ICONS = {
  image: Image,
  video: Film,
  audio: Music,
  text: FileText,
  default: File
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
const TEXT_EXTENSIONS = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'ts', 'css', 'html'];

const PAGE_SIZE = 100;

export default function FileBrowser({ bucketName, onBack }) {
  const [allObjects, setAllObjects] = useState([]); // 所有数据
  const [displayObjects, setDisplayObjects] = useState([]); // 当前显示的数据
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [selected, setSelected] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [mediaFilter, setMediaFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadObjects();
  }, [bucketName, prefix, mediaFilter]);

  // 监听滚动加载更多
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (loadingRef.current || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        loadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, allObjects, page]);

  const getFileType = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (TEXT_EXTENSIONS.includes(ext)) return 'text';
    return 'default';
  };

  const isImage = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
  };

  const isVideo = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return VIDEO_EXTENSIONS.includes(ext);
  };

  const loadObjects = async () => {
    setLoading(true);
    setError('');
    setSelected([]);
    setThumbnailUrls({});
    setPage(1);
    setAllObjects([]);
    setDisplayObjects([]);
    
    try {
      const isMediaMode = mediaFilter === 'images' || mediaFilter === 'videos';
      const { data } = await listObjects(bucketName, isMediaMode ? '' : prefix, isMediaMode);
      
      if (!Array.isArray(data)) {
        setAllObjects([]);
        setDisplayObjects([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      let items = [];
      
      if (isMediaMode) {
        const filterFn = mediaFilter === 'images' ? isImage : isVideo;
        items = data
          .filter(obj => obj.name && !obj.name.endsWith('/') && filterFn(obj.name))
          .map(obj => ({
            ...obj,
            isFolder: false,
            displayName: obj.name.split('/').pop()
          }))
          .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      } else {
        const folders = new Set();
        const files = [];
        
        data.forEach((obj) => {
          // 处理文件夹（prefix形式）
          if (obj.prefix) {
            const folderName = obj.prefix.slice(prefix.length).replace(/\/$/, '');
            if (folderName && !folderName.includes('/')) {
              folders.add(folderName);
            }
            return;
          }
          
          if (!obj.name || obj.name === prefix) return;
          
          const relativePath = obj.name.slice(prefix.length);
          if (!relativePath) return;
          
          // 处理子文件夹中的文件（递归模式下）
          if (relativePath.includes('/')) {
            const folderName = relativePath.split('/')[0];
            if (folderName) folders.add(folderName);
          } else if (!obj.name.endsWith('/')) {
            files.push({
              ...obj,
              isFolder: false,
              displayName: relativePath
            });
          }
        });
        
        items = [
          ...Array.from(folders).sort().map((name) => ({
            name: prefix + name + '/',
            isFolder: true,
            displayName: name
          })),
          ...files.sort((a, b) => a.displayName.localeCompare(b.displayName))
        ];
      }
      
      setAllObjects(items);
      const firstPage = items.slice(0, PAGE_SIZE);
      setDisplayObjects(firstPage);
      setHasMore(items.length > PAGE_SIZE);
      setLoading(false);
      
      // 异步加载第一页的缩略图
      loadThumbnailsForItems(firstPage);
      
    } catch (err) {
      console.error('Load error:', err);
      setError(err.response?.data?.error || '加载文件列表失败');
      setLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoadingMore(true);
    
    const nextPage = page + 1;
    const start = (nextPage - 1) * PAGE_SIZE;
    const end = nextPage * PAGE_SIZE;
    const newItems = allObjects.slice(start, end);
    
    if (newItems.length > 0) {
      setDisplayObjects(prev => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(end < allObjects.length);
      loadThumbnailsForItems(newItems);
    } else {
      setHasMore(false);
    }
    
    setLoadingMore(false);
    loadingRef.current = false;
  }, [page, allObjects, hasMore]);

  const loadThumbnailsForItems = async (items) => {
    const imageFiles = items.filter(f => !f.isFolder && isImage(f.displayName || f.name));
    if (imageFiles.length === 0) return;
    
    const imageNames = imageFiles.map(f => f.name);
    const batchSize = 20;
    
    for (let i = 0; i < imageNames.length; i += batchSize) {
      const batch = imageNames.slice(i, i + batchSize);
      try {
        const { data: urls } = await getPresignedUrls(bucketName, batch, 3600);
        setThumbnailUrls(prev => ({ ...prev, ...urls }));
      } catch (err) {
        console.error('Failed to get thumbnails:', err);
      }
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleFileSelect = (item, e) => {
    if (item.isFolder) {
      setMediaFilter('all');
      setPrefix(item.name);
    } else if (e?.ctrlKey || e?.metaKey) {
      setSelected(prev => prev.includes(item.name) 
        ? prev.filter(n => n !== item.name) 
        : [...prev, item.name]);
    }
  };

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(bucketName, files[i], prefix, (e) => {
          const progress = Math.round(((i + e.loaded / e.total) / files.length) * 100);
          setUploadProgress(progress);
        });
      }
      loadObjects();
    } catch (err) {
      setError(err.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`确定要删除 ${selected.length} 个文件吗？`)) return;

    try {
      await deleteObjects(bucketName, selected);
      setSelected([]);
      loadObjects();
    } catch (err) {
      setError(err.response?.data?.error || '删除失败');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createFolder(bucketName, prefix + newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
      loadObjects();
    } catch (err) {
      setError(err.response?.data?.error || '创建文件夹失败');
    }
  };

  const handlePreview = async (item) => {
    const filename = item.displayName || item.name;
    if (isImage(filename)) {
      let previewUrl = thumbnailUrls[item.name];
      if (!previewUrl) {
        try {
          const { data } = await getPresignedUrl(bucketName, item.name, 3600);
          previewUrl = data.url;
          setThumbnailUrls(prev => ({ ...prev, [item.name]: previewUrl }));
        } catch (err) {
          setError('无法获取预览链接');
          return;
        }
      }
      setPreviewImage({ url: previewUrl, name: filename });
    }
  };

  const handleDownload = async (item) => {
    try {
      const { data } = await getPresignedUrl(bucketName, item.name, 300);
      const a = document.createElement('a');
      a.href = data.url;
      a.download = item.displayName || item.name.split('/').pop();
      a.click();
    } catch (err) {
      setError('下载失败');
    }
  };

  const handleCopyUrl = async (item) => {
    try {
      const { data } = await getPresignedUrl(bucketName, item.name, 86400);
      await navigator.clipboard.writeText(data.url);
      setCopiedUrl(item.name);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      setError('复制链接失败');
    }
  };

  const breadcrumbs = [''].concat(prefix.split('/').filter(Boolean));
  const totalCount = allObjects.length;
  const imageCount = allObjects.filter(o => !o.isFolder && isImage(o.displayName || o.name)).length;
  const videoCount = allObjects.filter(o => !o.isFolder && isVideo(o.displayName || o.name)).length;

  return (
    <div className="file-browser">
      <div className="browser-header">
        <div className="header-left">
          <button className="btn-icon" onClick={onBack} title="返回桶列表">
            <ArrowLeft size={18} />
          </button>
          <div className="breadcrumbs">
            {mediaFilter !== 'all' ? (
              <span className="media-filter-label">
                {mediaFilter === 'images' ? `全部图片 (${totalCount})` : `全部视频 (${totalCount})`}
              </span>
            ) : (
              breadcrumbs.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <ChevronRight size={16} className="separator" />}
                  <button
                    className="crumb"
                    onClick={() => setPrefix(breadcrumbs.slice(1, i + 1).join('/') + (i > 0 ? '/' : ''))}
                  >
                    {i === 0 ? bucketName : crumb}
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
        <div className="header-actions">
          <div className="media-filter">
            <button className={`filter-btn ${mediaFilter === 'all' ? 'active' : ''}`} onClick={() => setMediaFilter('all')}>
              全部
            </button>
            <button className={`filter-btn ${mediaFilter === 'images' ? 'active' : ''}`} onClick={() => setMediaFilter('images')}>
              <Image size={14} />图片
            </button>
            <button className={`filter-btn ${mediaFilter === 'videos' ? 'active' : ''}`} onClick={() => setMediaFilter('videos')}>
              <Film size={14} />视频
            </button>
          </div>
          
          <div className="view-toggle">
            <button className={`btn-icon-sm ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid size={16} />
            </button>
            <button className={`btn-icon-sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={16} />
            </button>
          </div>
          <button className="btn-icon" onClick={loadObjects} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          {mediaFilter === 'all' && (
            <button className="btn-icon" onClick={() => setShowNewFolder(true)} title="新建文件夹">
              <Plus size={18} />
            </button>
          )}
          <button className="btn btn-primary-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 size={16} className="spin" />{uploadProgress}%</> : <><Upload size={16} />上传</>}
          </button>
          <input ref={fileInputRef} type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {showNewFolder && (
        <div className="new-folder-form">
          <form onSubmit={handleCreateFolder}>
            <FolderOpen size={18} />
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="文件夹名称" autoFocus />
            <button type="submit" className="btn btn-primary-sm">创建</button>
            <button type="button" className="btn btn-secondary-sm" onClick={() => setShowNewFolder(false)}>取消</button>
          </form>
        </div>
      )}

      {selected.length > 0 && (
        <div className="selection-bar">
          <span>已选择 {selected.length} 个文件</span>
          <button className="btn btn-danger-sm" onClick={handleDelete}><Trash2 size={16} />删除</button>
          <button className="btn btn-secondary-sm" onClick={() => setSelected([])}>取消选择</button>
        </div>
      )}

      {!loading && mediaFilter === 'all' && (
        <div className="stats-bar">
          <span>{totalCount} 项</span>
          {imageCount > 0 && <span className="stat-item"><Image size={14} /> {imageCount}</span>}
          {videoCount > 0 && <span className="stat-item"><Film size={14} /> {videoCount}</span>}
          {hasMore && <span className="stat-item">显示 {displayObjects.length}/{totalCount}</span>}
        </div>
      )}

      <div className="file-content" ref={scrollRef}>
        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} className="spin" />
            <p>加载中...</p>
          </div>
        ) : displayObjects.length === 0 ? (
          <div className="empty-state">
            {mediaFilter !== 'all' ? (
              <>{mediaFilter === 'images' ? <Image size={48} /> : <Film size={48} />}<p>没有{mediaFilter === 'images' ? '图片' : '视频'}文件</p></>
            ) : (
              <><FolderOpen size={48} /><p>文件夹为空</p><button className="btn btn-primary-sm" onClick={() => fileInputRef.current?.click()}>上传文件</button></>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="file-grid">
            {displayObjects.map((item) => {
              const filename = item.displayName || item.name;
              const isImg = !item.isFolder && isImage(filename);
              const isVid = !item.isFolder && isVideo(filename);
              const FileIcon = item.isFolder ? FolderOpen : FILE_ICONS[getFileType(filename)];
              const isSelected = selected.includes(item.name);
              const thumbUrl = thumbnailUrls[item.name];

              return (
                <div
                  key={item.name}
                  className={`grid-item ${isSelected ? 'selected' : ''} ${isImg || isVid ? 'media-item' : ''}`}
                  onClick={(e) => handleFileSelect(item, e)}
                  onDoubleClick={() => isImg && handlePreview(item)}
                >
                  <div className="grid-item-preview">
                    {isImg && thumbUrl ? (
                      <img src={thumbUrl} alt={filename} loading="lazy" />
                    ) : isImg ? (
                      <div className="grid-item-icon loading"><Loader2 size={24} className="spin" /></div>
                    ) : isVid ? (
                      <div className="grid-item-icon video"><Film size={40} /><span className="video-badge">VIDEO</span></div>
                    ) : (
                      <div className="grid-item-icon"><FileIcon size={item.isFolder ? 48 : 40} /></div>
                    )}
                  </div>
                  <div className="grid-item-info">
                    <span className="grid-item-name" title={filename}>{filename}</span>
                    {!item.isFolder && <span className="grid-item-size">{formatSize(item.size)}</span>}
                  </div>
                  {!item.isFolder && (
                    <div className="grid-item-actions">
                      {isImg && <button onClick={(e) => { e.stopPropagation(); handlePreview(item); }} title="预览"><Eye size={14} /></button>}
                      <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} title="下载"><Download size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleCopyUrl(item); }} title="复制链接">
                        {copiedUrl === item.name ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="file-list">
            <div className="file-list-header">
              <span className="col-name">名称</span>
              <span className="col-size">大小</span>
              <span className="col-date">修改时间</span>
              <span className="col-actions">操作</span>
            </div>
            {displayObjects.map((item) => {
              const filename = item.displayName || item.name;
              const FileIcon = item.isFolder ? FolderOpen : FILE_ICONS[getFileType(filename)];
              const isImg = !item.isFolder && isImage(filename);
              const isSelected = selected.includes(item.name);
              const thumbUrl = thumbnailUrls[item.name];

              return (
                <div key={item.name} className={`file-item ${isSelected ? 'selected' : ''}`} onClick={(e) => handleFileSelect(item, e)}>
                  <div className="col-name">
                    {isImg && thumbUrl ? (
                      <img src={thumbUrl} alt="" className="list-thumbnail" loading="lazy" />
                    ) : (
                      <FileIcon size={20} className={item.isFolder ? 'folder-icon' : 'file-icon'} />
                    )}
                    <span className="file-name">{filename}</span>
                  </div>
                  <span className="col-size">{item.isFolder ? '-' : formatSize(item.size)}</span>
                  <span className="col-date">{item.isFolder ? '-' : formatDate(item.lastModified)}</span>
                  <div className="col-actions">
                    {!item.isFolder && (
                      <>
                        {isImg && <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); handlePreview(item); }} title="预览"><Eye size={16} /></button>}
                        <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); handleDownload(item); }} title="下载"><Download size={16} /></button>
                        <button className="btn-icon-sm" onClick={(e) => { e.stopPropagation(); handleCopyUrl(item); }} title="复制链接">
                          {copiedUrl === item.name ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {loadingMore && (
          <div className="loading-more">
            <Loader2 size={20} className="spin" />
            <span>加载更多...</span>
          </div>
        )}
        
        {!loading && hasMore && !loadingMore && (
          <div className="load-more-hint">向下滚动加载更多</div>
        )}
      </div>

      {previewImage && (
        <ImagePreview url={previewImage.url} name={previewImage.name} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
}
