import { useState, useEffect } from 'react';
import { Database, Settings, HardDrive } from 'lucide-react';
import ConnectionConfig from './components/ConnectionConfig';
import BucketManager from './components/BucketManager';
import FileBrowser from './components/FileBrowser';
import { getStatus } from './services/api';
import './App.css';

function App() {
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data } = await getStatus();
      setConnected(data.connected);
      if (data.connected) {
        setActiveTab('buckets');
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleConnectionChange = (isConnected) => {
    setConnected(isConnected);
    if (isConnected) {
      setActiveTab('buckets');
    } else {
      setActiveTab('connection');
      setSelectedBucket(null);
    }
  };

  const handleSelectBucket = (bucketName) => {
    setSelectedBucket(bucketName);
  };

  if (checking) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>正在检查连接状态...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-header">
          <HardDrive size={24} />
          <span>MinIO 管理</span>
        </div>
        
        <div className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('connection');
              setSelectedBucket(null);
            }}
          >
            <Settings size={18} />
            <span>连接设置</span>
          </button>
          
          {connected && (
            <button
              className={`menu-item ${activeTab === 'buckets' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('buckets');
                setSelectedBucket(null);
              }}
            >
              <Database size={18} />
              <span>存储桶</span>
            </button>
          )}
        </div>

        <div className="sidebar-footer">
          <div className={`connection-indicator ${connected ? 'connected' : ''}`}>
            <div className="indicator-dot"></div>
            <span>{connected ? '已连接' : '未连接'}</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'connection' && (
          <div className="content-wrapper">
            <ConnectionConfig onConnectionChange={handleConnectionChange} />
          </div>
        )}

        {activeTab === 'buckets' && !selectedBucket && (
          <div className="content-wrapper">
            <BucketManager onSelectBucket={handleSelectBucket} />
          </div>
        )}

        {activeTab === 'buckets' && selectedBucket && (
          <div className="content-wrapper full">
            <FileBrowser
              bucketName={selectedBucket}
              onBack={() => setSelectedBucket(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
