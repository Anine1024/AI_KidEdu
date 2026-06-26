import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ImageCaptureAndProcess.less'

function ImageCaptureAndProcess({
  title,
  onRecognition,
  resultComponent: ResultComponent,
  resultData,
  theme = 'default',
  className = '',
  onClear,
  progressText = 'AI 识别中'
}) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState(null);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const speechRef = useRef(null);
  
  // 处理拍照功能
  const handleTakePhoto = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      // 延迟拍照，让摄像头准备好
      setTimeout(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        // 停止摄像头
        stream.getTracks().forEach(track => track.stop());
        
        // 将canvas转换为blob并处理
        canvas.toBlob((blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setSelectedImage(imageUrl);
            // 将Blob转换为File对象，添加文件名和类型
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
            // 调用识别处理函数（含loading状态管理）
            handleRecognition(file);
          }
        }, 'image/jpeg', 0.7);
      }, 1000);
    } catch (err) {
      setError('无法访问摄像头，请检查权限设置');
      console.error('拍照失败:', err);
    }
  };
  
  // 处理图片上传
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setError(null);
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      // 调用识别处理函数（含loading状态管理）
      handleRecognition(file);
    }
  };
  
  // 辅助函数：将文件转换为data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result); // 保留完整的data URL格式
      reader.onerror = error => reject(error);
    });
  };

  // 通用识别处理函数
  const handleRecognition = async (file) => {
    setIsRecognizing(true);
    setError(null);
    
    try {
      // 调用外部传入的识别函数
      await onRecognition(file);
    } catch (err) {
      console.error('识别失败:', err);
      setError(`识别失败: ${err.message}`);
    } finally {
      setIsRecognizing(false);
    }
  };
  
  // 语音播报功能
  const handleVoiceBroadcast = (text) => {
    if (text) {
      if (isVoicePlaying) {
        // 停止播放
        window.speechSynthesis.cancel();
        setIsVoicePlaying(false);
        speechRef.current = null;
      } else {
        // 开始播放
        const speech = new SpeechSynthesisUtterance();
        speech.text = text;
        speech.lang = 'zh-CN';
        speech.volume = 1;
        speech.rate = 0.8;
        speech.pitch = 1.0;
        
        // 监听语音播放状态
        speech.onstart = () => setIsVoicePlaying(true);
        speech.onend = () => setIsVoicePlaying(false);
        speech.onerror = () => setIsVoicePlaying(false);
        
        speechRef.current = speech;
        window.speechSynthesis.speak(speech);
      }
    }
  };

  // 清除当前图片和结果
  const handleClear = () => {
    // 停止语音播放
    if (isVoicePlaying) {
      window.speechSynthesis.cancel();
      setIsVoicePlaying(false);
      speechRef.current = null;
    }
    
    setSelectedImage(null);
    setError(null);
    if (typeof onClear === 'function') onClear();
  };

  // 主题颜色配置
  const themeConfig = {
    default: {
      primary: '#ff7a45',
      secondary: '#f5f5f5',
      loading: '#ff6b6b',
      voice: '#ffd166',
      gradient: ['#fef3e6', '#e6f7ff']
    },
    green: {
      primary: '#4caf50',
      secondary: '#f5f5f5', 
      loading: '#4caf50',
      voice: '#4caf50',
      gradient: ['#e8f5e8', '#fff3e0']
    }
  };

  const currentTheme = themeConfig[theme] || themeConfig.default;
  
  return (
    <div className={`image-capture-root ${className}`}>
      <header className="image-capture-header">
        <button className="image-capture-header__back" onClick={() => navigate('/')}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>{title}</h1>
        <div className="image-capture-header__placeholder"></div>
      </header>
      
      <main className="image-capture-main">
        {/* 图片预览区域 */}
        <section className="image-capture-preview" style={{
          background: `radial-gradient(circle at 20% 20%, ${currentTheme.gradient[0]} 0, transparent 35%),
                      radial-gradient(circle at 90% 10%, ${currentTheme.gradient[1]} 0, transparent 40%),
                      #ffffff`
        }}>
          {selectedImage ? (
            <div className="image-capture-preview__image-container">
              <img src={selectedImage} alt="预览" className="image-capture-preview__image" />
              <button className="image-capture-preview__clear" onClick={handleClear}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          ) : (
            <div className="image-capture-preview__placeholder">
              <i className="fas fa-image"></i>
              <p>点击下方按钮拍照或上传图片</p>
            </div>
          )}
        </section>
        
        {/* 拍照和上传按钮 */}
        <section className="image-capture-actions">
          <button 
            className="image-capture-btn image-capture-btn--primary" 
            onClick={handleTakePhoto}
            style={{ backgroundColor: currentTheme.primary }}
          >
            <i className="fas fa-camera"></i>
            拍照
          </button>
          <button 
            className="image-capture-btn image-capture-btn--secondary" 
            onClick={() => fileInputRef.current.click()}
          >
            <i className="fas fa-upload"></i>
            上传图片
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImageUpload}
          />
        </section>
        
        {/* 识别过程提示 */}
        {isRecognizing && (
          <div className="image-capture-loading">
            <div className="image-capture-loading__spinner" style={{
              borderColor: `${currentTheme.loading}33`,
              borderTopColor: currentTheme.loading
            }}></div>
            <p className="image-capture-loading__text">{progressText}</p>
            <div className="image-capture-loading__bar">
              <div className="image-capture-loading__bar-fill" />
            </div>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="image-capture-error">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
          </div>
        )}
        
        {/* 结果展示 */}
        {resultData && ResultComponent && (
          <ResultComponent 
            data={resultData} 
            onVoiceBroadcast={handleVoiceBroadcast}
            isVoicePlaying={isVoicePlaying}
          />
        )}
        
        {/* 隐藏的视频和画布元素，用于拍照 */}
        <video ref={videoRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </main>
    </div>
  );
}

export default ImageCaptureAndProcess;