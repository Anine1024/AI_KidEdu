import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/videoPlayer.less';

const AUTH_TOKEN_KEY = 'auth_token';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VideoPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [copied, setCopied] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await fetch(`/api/videos/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '获取视频信息失败');
        setVideo(data.video);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  // 自动隐藏浮层
  const resetHideTimer = useCallback(() => {
    setShowOverlay(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowOverlay(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch(`/api/videos/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '删除失败');
      navigate('/videos');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="vp-root">
        <div className="vp-loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>加载视频...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="vp-root">
        <div className="vp-error">
          <i className="fas fa-film"></i>
          <p>{error || '视频不存在'}</p>
          <button onClick={() => navigate('/videos')}>返回列表</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vp-root" onMouseMove={resetHideTimer} onTouchStart={resetHideTimer}>
      {/* 浮层顶栏 */}
      <header className={`vp-overlay${showOverlay ? ' vp-overlay--visible' : ''}`}>
        <button className="vp-overlay__back" onClick={(e) => { e.stopPropagation(); navigate('/videos'); }}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <span className="vp-overlay__title">{video.title}</span>
        <div className="vp-overlay__spacer"></div>
      </header>

      {/* 视频播放器 */}
      <div className="vp-container" onClick={resetHideTimer}>
        <video
          className="vp-video"
          src={`/api/videos/${id}/file`}
          controls
          preload="metadata"
          playsInline
        >
          您的浏览器不支持视频播放
        </video>
      </div>

      {/* 底部信息区 */}
      <div className="vp-info">
        <div className="vp-info__row">
          <span className="vp-info__title">{video.title}</span>
        </div>
        <div className="vp-info__row vp-info__row--meta">
          <span className="vp-info__chip">
            <i className="fas fa-file-video"></i>{formatSize(video.fileSize)}
          </span>
          <span className="vp-info__chip">
            <i className="fas fa-clock"></i>{formatDate(video.createdAt)}
          </span>
          {video.uploaderName && (
            <span className="vp-info__chip">
              <i className="fas fa-user-circle"></i>{video.uploaderName}
            </span>
          )}
        </div>
        <div className="vp-info__divider"></div>
        <div className="vp-info__row vp-info__row--actions">
          <button className="vp-info__action-btn" onClick={handleCopyLink}>
            <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
            {copied ? '已复制' : '复制链接'}
          </button>
          <button
            className="vp-info__action-btn vp-info__action-btn--danger"
            onClick={() => setShowDeleteModal(true)}
          >
            <i className="fas fa-trash-alt"></i>
            删除
          </button>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <div className="vp-modal-mask" onClick={() => setShowDeleteModal(false)}>
          <div className="vp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vp-modal__icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3>确认删除</h3>
            <p>确定要删除「{video.title}」吗？此操作不可撤销。</p>
            <div className="vp-modal__actions">
              <button
                className="vp-modal__btn vp-modal__btn--cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                className="vp-modal__btn vp-modal__btn--confirm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayerPage;
