import { useState, useRef, useEffect } from 'react';
import { 
  X, ZoomIn, ZoomOut, RotateCw, RotateCcw, 
  Maximize2, Download, Move 
} from 'lucide-react';
import './ImagePreview.css';

export default function ImagePreview({ url, name, onClose }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === 'r') handleRotateRight();
      if (e.key === 'l') handleRotateLeft();
      if (e.key === '0') handleReset();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleZoomIn = () => {
    setScale((s) => Math.min(s * 1.25, 5));
  };

  const handleZoomOut = () => {
    setScale((s) => Math.max(s / 1.25, 0.1));
  };

  const handleRotateRight = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((r) => (r - 90 + 360) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div 
      className="image-preview-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="preview-header">
        <span className="preview-title">{name}</span>
        <div className="preview-info">
          <span>{Math.round(scale * 100)}%</span>
          <span>{rotation}°</span>
        </div>
      </div>

      <div 
        className="preview-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {!loaded && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>加载中...</span>
          </div>
        )}
        <img
          ref={imageRef}
          src={url}
          alt={name}
          className={`preview-image ${loaded ? 'loaded' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </div>

      <div className="preview-toolbar">
        <button onClick={handleZoomOut} title="缩小 (-)">
          <ZoomOut size={20} />
        </button>
        <button onClick={handleZoomIn} title="放大 (+)">
          <ZoomIn size={20} />
        </button>
        <div className="toolbar-divider"></div>
        <button onClick={handleRotateLeft} title="左旋转 (L)">
          <RotateCcw size={20} />
        </button>
        <button onClick={handleRotateRight} title="右旋转 (R)">
          <RotateCw size={20} />
        </button>
        <div className="toolbar-divider"></div>
        <button onClick={handleReset} title="重置 (0)">
          <Maximize2 size={20} />
        </button>
        <button onClick={handleDownload} title="下载">
          <Download size={20} />
        </button>
      </div>

      <button className="close-button" onClick={onClose} title="关闭 (ESC)">
        <X size={24} />
      </button>

      <div className="preview-hints">
        <span><Move size={14} /> 拖动移动</span>
        <span>滚轮缩放</span>
        <span>ESC 关闭</span>
      </div>
    </div>
  );
}
