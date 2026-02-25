import { useState, useEffect } from 'react';
import { Database, Link, Unlink, Loader2 } from 'lucide-react';
import { connect, disconnect, getStatus } from '../services/api';
import './ConnectionConfig.css';

export default function ConnectionConfig({ onConnectionChange }) {
  const [config, setConfig] = useState({
    endPoint: 'localhost',
    port: '9000',
    accessKey: '',
    secretKey: '',
    useSSL: false
  });
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [connectionInfo, setConnectionInfo] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { data } = await getStatus();
      setConnected(data.connected);
      setConnectionInfo(data.config);
      onConnectionChange?.(data.connected);
    } catch (err) {
      console.error('Status check failed:', err);
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await connect(config);
      setConnected(true);
      setConnectionInfo({
        endPoint: config.endPoint,
        port: config.port,
        useSSL: config.useSSL
      });
      onConnectionChange?.(true);
    } catch (err) {
      setError(err.response?.data?.message || '连接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnect();
      setConnected(false);
      setConnectionInfo(null);
      onConnectionChange?.(false);
    } catch (err) {
      setError(err.response?.data?.message || '断开连接失败');
    } finally {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="connection-status">
        <div className="status-header">
          <Database size={24} />
          <span>已连接到 MinIO</span>
        </div>
        <div className="status-info">
          <p>
            <strong>服务器:</strong> 
            {connectionInfo?.useSSL ? 'https://' : 'http://'}
            {connectionInfo?.endPoint}:{connectionInfo?.port}
          </p>
        </div>
        <button 
          className="btn btn-danger" 
          onClick={handleDisconnect}
          disabled={loading}
        >
          {loading ? <Loader2 className="spin" size={16} /> : <Unlink size={16} />}
          断开连接
        </button>
      </div>
    );
  }

  return (
    <div className="connection-config">
      <div className="config-header">
        <Database size={24} />
        <h2>连接 MinIO 服务器</h2>
      </div>
      
      <form onSubmit={handleConnect}>
        <div className="form-row">
          <div className="form-group flex-2">
            <label>服务器地址</label>
            <input
              type="text"
              value={config.endPoint}
              onChange={(e) => setConfig({ ...config, endPoint: e.target.value })}
              placeholder="localhost 或 IP地址"
              required
            />
          </div>
          <div className="form-group flex-1">
            <label>端口</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              placeholder="9000"
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Access Key</label>
          <input
            type="text"
            value={config.accessKey}
            onChange={(e) => setConfig({ ...config, accessKey: e.target.value })}
            placeholder="输入 Access Key"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Secret Key</label>
          <input
            type="password"
            value={config.secretKey}
            onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
            placeholder="输入 Secret Key"
            required
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={config.useSSL}
              onChange={(e) => setConfig({ ...config, useSSL: e.target.checked })}
            />
            <span>使用 SSL (HTTPS)</span>
          </label>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <Loader2 className="spin" size={16} /> : <Link size={16} />}
          连接
        </button>
      </form>
    </div>
  );
}
