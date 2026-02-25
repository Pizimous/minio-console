import { useState, useEffect } from 'react';
import { 
  Box, Plus, Trash2, Shield, Lock, Unlock, Globe, 
  Loader2, RefreshCw, FolderOpen, X 
} from 'lucide-react';
import { 
  listBuckets, createBucket, deleteBucket, 
  getBucketPolicy, setBucketAccess 
} from '../services/api';
import './BucketManager.css';

export default function BucketManager({ onSelectBucket }) {
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPolicy, setShowPolicy] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadBuckets();
  }, []);

  const loadBuckets = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await listBuckets();
      setBuckets(data);
    } catch (err) {
      setError(err.response?.data?.error || '加载桶列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    
    setCreating(true);
    try {
      await createBucket(newBucketName.trim());
      setNewBucketName('');
      setShowCreate(false);
      loadBuckets();
    } catch (err) {
      setError(err.response?.data?.error || '创建桶失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (bucketName) => {
    if (!confirm(`确定要删除桶 "${bucketName}" 吗？此操作不可恢复。`)) return;
    
    try {
      await deleteBucket(bucketName);
      loadBuckets();
    } catch (err) {
      setError(err.response?.data?.error || '删除桶失败（桶必须为空）');
    }
  };

  const openPolicyModal = async (bucketName) => {
    setShowPolicy(bucketName);
    setPolicyLoading(true);
    try {
      const { data } = await getBucketPolicy(bucketName);
      setCurrentPolicy(data.policy);
    } catch (err) {
      setCurrentPolicy('');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSetAccess = async (access) => {
    setPolicyLoading(true);
    try {
      await setBucketAccess(showPolicy, access);
      const { data } = await getBucketPolicy(showPolicy);
      setCurrentPolicy(data.policy);
    } catch (err) {
      setError(err.response?.data?.error || '设置权限失败');
    } finally {
      setPolicyLoading(false);
    }
  };

  const getAccessType = (policy) => {
    if (!policy) return 'private';
    try {
      const parsed = JSON.parse(policy);
      const actions = parsed.Statement?.[0]?.Action || [];
      if (actions.includes('s3:PutObject') || actions.includes('s3:DeleteObject')) {
        return 'public-read-write';
      }
      if (actions.includes('s3:GetObject')) {
        return 'public-read';
      }
    } catch {
      return 'custom';
    }
    return 'private';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bucket-manager">
      <div className="manager-header">
        <div className="header-left">
          <Box size={24} />
          <h2>存储桶管理</h2>
          <span className="bucket-count">{buckets.length} 个桶</span>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={loadBuckets} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary-sm" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            创建桶
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {showCreate && (
        <div className="create-form">
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              placeholder="输入桶名称（小写字母、数字、连字符）"
              pattern="^[a-z0-9][a-z0-9.-]*[a-z0-9]$"
              required
              autoFocus
            />
            <button type="submit" className="btn btn-primary-sm" disabled={creating}>
              {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              创建
            </button>
            <button 
              type="button" 
              className="btn btn-secondary-sm" 
              onClick={() => setShowCreate(false)}
            >
              取消
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <Loader2 size={32} className="spin" />
          <p>加载中...</p>
        </div>
      ) : buckets.length === 0 ? (
        <div className="empty-state">
          <Box size={48} />
          <p>暂无存储桶</p>
          <button className="btn btn-primary-sm" onClick={() => setShowCreate(true)}>
            创建第一个桶
          </button>
        </div>
      ) : (
        <div className="bucket-list">
          {buckets.map((bucket) => (
            <div key={bucket.name} className="bucket-item">
              <div className="bucket-info" onClick={() => onSelectBucket?.(bucket.name)}>
                <FolderOpen size={20} />
                <div className="bucket-details">
                  <span className="bucket-name">{bucket.name}</span>
                  <span className="bucket-date">创建于 {formatDate(bucket.creationDate)}</span>
                </div>
              </div>
              <div className="bucket-actions">
                <button 
                  className="btn-icon" 
                  title="权限设置"
                  onClick={() => openPolicyModal(bucket.name)}
                >
                  <Shield size={18} />
                </button>
                <button 
                  className="btn-icon danger" 
                  title="删除桶"
                  onClick={() => handleDelete(bucket.name)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Modal */}
      {showPolicy && (
        <div className="modal-overlay" onClick={() => setShowPolicy(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Shield size={20} />
              <h3>桶权限设置 - {showPolicy}</h3>
              <button className="btn-close" onClick={() => setShowPolicy(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              {policyLoading ? (
                <div className="loading-state">
                  <Loader2 size={24} className="spin" />
                </div>
              ) : (
                <>
                  <div className="access-options">
                    <button 
                      className={`access-option ${getAccessType(currentPolicy) === 'private' ? 'active' : ''}`}
                      onClick={() => handleSetAccess('private')}
                    >
                      <Lock size={24} />
                      <span className="option-title">私有</span>
                      <span className="option-desc">仅授权用户可访问</span>
                    </button>
                    <button 
                      className={`access-option ${getAccessType(currentPolicy) === 'public-read' ? 'active' : ''}`}
                      onClick={() => handleSetAccess('public-read')}
                    >
                      <Unlock size={24} />
                      <span className="option-title">公共读</span>
                      <span className="option-desc">任何人可读取，仅授权用户可写入</span>
                    </button>
                    <button 
                      className={`access-option ${getAccessType(currentPolicy) === 'public-read-write' ? 'active' : ''}`}
                      onClick={() => handleSetAccess('public-read-write')}
                    >
                      <Globe size={24} />
                      <span className="option-title">公共读写</span>
                      <span className="option-desc">任何人可读写（谨慎使用）</span>
                    </button>
                  </div>
                  
                  {currentPolicy && (
                    <div className="policy-preview">
                      <h4>当前策略 (JSON)</h4>
                      <pre>{JSON.stringify(JSON.parse(currentPolicy), null, 2)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
