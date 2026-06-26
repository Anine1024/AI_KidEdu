import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/videoList.less';
import BottomNavigation from '../components/BottomNavigation';

const AUTH_TOKEN_KEY = 'auth_token';
const CHUNK_SIZE = 5 * 1024 * 1024;   // 5MB / chunk
const SMALL_FILE = 10 * 1024 * 1024;   // ≤10MB 走单文件直传
const MAX_RETRIES = 3;                 // 每片最多重试 3 次
const RETRY_DELAYS = [0, 1000, 3000]; // 重试间隔: 立即 / 1s / 3s

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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VideoListPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // null | progress object
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);                              // AbortController
  const navigate = useNavigate();

  // 加载视频列表
  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/videos?page=1&pageSize=50');
      const data = await res.json();
      if (res.ok) setVideos(data.rows || []);
    } catch (err) {
      console.error('获取视频列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  // ---- 工具：带 token 的 fetch ----
  const authFetch = (url, opts = {}) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return fetch(url, {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  };

  // ---- 单文件直传（≤10MB） ----
  const simpleUpload = async (file) => {
    const startTime = Date.now();
    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress({
      type: 'single', fileName: file.name, totalBytes: file.size,
      bytesUploaded: 0, speed: '0 B/s'
    });

    const res = await authFetch('/api/videos/upload', { method: 'POST', body: formData });

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (e) { throw new Error('服务器返回异常'); }

    if (!res.ok) throw new Error(data.message || '上传失败');

    const elapsed = (Date.now() - startTime) / 1000;
    setUploadProgress(null);
    await fetchVideos();
  };

  // ---- 分片上传（>10MB） ----
  const chunkedUpload = async (file) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setUploadProgress({
      type: 'chunked', fileName: file.name, totalBytes: file.size,
      bytesUploaded: 0, uploadedChunks: 0, totalChunks,
      speed: '0 B/s', retrying: false
    });

    // 1) 初始化
    const initRes = await authFetch('/api/videos/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size, mimeType: file.type, totalChunks })
    });
    const initData = await initRes.json();
    if (!initRes.ok) throw new Error(initData.message || '初始化上传失败');
    const { uploadId } = initData;

    abortRef.current = new AbortController();
    let bytesUploaded = 0;
    const startTime = Date.now();

    // 2) 逐片上传（含重试）
    for (let i = 0; i < totalChunks; i++) {
      if (abortRef.current?.signal.aborted) break;

      let lastErr = null;
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          if (retry > 0) {
            setUploadProgress(prev => ({ ...prev, retrying: true }));
            await new Promise(r => setTimeout(r, RETRY_DELAYS[retry]));
            setUploadProgress(prev => ({ ...prev, retrying: false }));
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const blob = file.slice(start, end);

          const chunkForm = new FormData();
          chunkForm.append('uploadId', uploadId);
          chunkForm.append('chunkIndex', String(i));
          chunkForm.append('chunk', blob, `chunk_${i}`);

          const res = await authFetch('/api/videos/upload/chunk', {
            method: 'POST',
            body: chunkForm,
            signal: abortRef.current?.signal
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || '分片上传失败');

          bytesUploaded += blob.size;
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = bytesUploaded / Math.max(elapsed, 0.1);

          setUploadProgress(prev => ({
            ...prev,
            bytesUploaded,
            uploadedChunks: i + 1,
            speed: formatSize(speed) + '/s'
          }));
          lastErr = null;
          break; // 成功，跳到下一片
        } catch (err) {
          lastErr = err;
        }
      }
      if (lastErr) throw new Error(`分片 ${i + 1}/${totalChunks} 上传失败: ${lastErr.message}`);
    }

    if (abortRef.current?.signal.aborted) return;

    // 3) 合并
    const completeRes = await authFetch('/api/videos/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId })
    });
    const completeData = await completeRes.json();
    if (!completeRes.ok) {
      if (completeData.missingChunks) {
        throw new Error(`分片不完整，缺少: ${completeData.missingChunks.join(', ')}`);
      }
      throw new Error(completeData.message || '合并失败');
    }

    setUploadProgress(null);
    await fetchVideos();
  };

  // ---- 入口：根据文件大小选择上传方式 ----
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    abortRef.current = new AbortController();

    try {
      if (file.size <= SMALL_FILE) {
        await simpleUpload(file);
      } else {
        await chunkedUpload(file);
      }
    } catch (err) {
      if (err.name === 'AbortError' || abortRef.current?.signal.aborted) {
        setUploadProgress(null);
      } else {
        setError(err.message);
        setUploadProgress(null);
      }
      // 如有残留会话，清理
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---- 取消上传 ----
  const handleCancel = () => {
    if (abortRef.current) abortRef.current.abort();
    setUploadProgress(null);
  };

  const isUploading = !!uploadProgress;

  return (
    <div className="video-list-root">
      <header className="video-list-header">
        <button className="video-list-header__back" onClick={() => navigate('/ai')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>视频中心</h1>
        <button
          className="video-list-header__upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`}></i>
          上传
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="video/mp4,video/webm,video/avi,video/quicktime,video/x-matroska"
          onChange={handleUpload}
        />
      </header>

      {/* 上传进度卡片 */}
      {uploadProgress && (
        <div className="upload-progress-card">
          <div className="upload-progress-card__header">
            <i className="fas fa-cloud-upload-alt"></i>
            <span className="upload-progress-card__title">
              {uploadProgress.type === 'single' ? '正在上传...' : `分片上传 ${uploadProgress.uploadedChunks}/${uploadProgress.totalChunks}`}
              {uploadProgress.retrying && ' (重试中...)'}
            </span>
            <button className="upload-progress-card__cancel" onClick={handleCancel}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="upload-progress-card__bar-wrap">
            <div className="upload-progress-card__bar" style={{
              width: Math.round((uploadProgress.bytesUploaded / uploadProgress.totalBytes) * 100) + '%'
            }}></div>
          </div>
          <div className="upload-progress-card__stats">
            <span>{formatSize(uploadProgress.bytesUploaded)} / {formatSize(uploadProgress.totalBytes)}</span>
            <span>{Math.round((uploadProgress.bytesUploaded / uploadProgress.totalBytes) * 100)}%</span>
            <span>{uploadProgress.speed}</span>
          </div>
          <div className="upload-progress-card__file">
            {uploadProgress.fileName}
          </div>
        </div>
      )}

      {error && (
        <div className="video-list-error">
          <i className="fas fa-exclamation-circle"></i>
          <span>{error}</span>
          <button onClick={() => setError(null)}><i className="fas fa-times"></i></button>
        </div>
      )}

      <section className="video-list-content">
        {loading ? (
          <div className="video-list-empty">
            <i className="fas fa-spinner fa-spin"></i>
            <p>加载中...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="video-list-empty">
            <i className="fas fa-film"></i>
            <p>还没有视频</p>
            <span>点击右上角上传第一个视频吧</span>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map(video => (
              <div key={video.id} className="video-card" onClick={() => navigate(`/videos/${video.id}`)}>
                <div className="video-card__thumbnail">
                  <i className="fas fa-play-circle"></i>
                </div>
                <div className="video-card__info">
                  <h3>{video.title}</h3>
                  <div className="video-card__meta">
                    <span>{formatSize(video.file_size)}</span>
                    <span>·</span>
                    <span>{formatDate(video.created_at)}</span>
                  </div>
                  {video.uploader_name && (
                    <div className="video-card__uploader">上传者: {video.uploader_name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNavigation activeTab={activeTab} />
    </div>
  );
}

export default VideoListPage;
