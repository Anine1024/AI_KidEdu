import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AIPage from './pages/AIPage';
import MinePage from './pages/MinePage';
import ForgotPassword from './pages/ForgotPassword';
import ObjectRecognitionPage from './pages/ObjectRecognitionPage';
import LearnWordsPage from './pages/LearnWordsPage';
import AIDialoguePage from './pages/AIDialoguePage';
import VideoListPage from './pages/VideoListPage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import './styles/app.less';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EXPIRES_KEY = 'auth_expires_at';
const USER_INFO_KEY = 'user_info';

// 认证保护路由组件
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(AUTH_EXPIRES_KEY) || 0);
    if (token && expiresAt > Date.now()) {
      setIsAuthed(true);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_EXPIRES_KEY);
      localStorage.removeItem(USER_INFO_KEY);
      setIsAuthed(false);
      navigate('/login');
    }
  }, [navigate]);

  return isAuthed ? children : null;
};

// 登录和注册页面组件
const AuthPage = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  const handleLoginSuccess = (token, user) => {
    // 设定 24h 免登
    const ttlMs = 24 * 60 * 60 * 1000;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EXPIRES_KEY, String(Date.now() + ttlMs));
    if (user) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    }
    navigate('/');
  };

  const handleRegistered = () => {
    setActiveTab('login');
  };

  const handleOAuth = (provider) => {
    // 这里先简单跳转到后端占位接口，实际项目中应走 OAuth 授权流程
    window.location.href = `/api/auth/${provider}`;
  };

  const handleShowForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackFromForgotPassword = () => {
    setShowForgotPassword(false);
  };

  if (showForgotPassword) {
    return (
      <div className="app-root">
        <div className="cartoon-bg"></div>
        <div className="auth-card">
          <div className="auth-card-wrapper">
            <ForgotPassword onBack={handleBackFromForgotPassword} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="cartoon-bg"></div>
      <div className="auth-card">
        <div className="auth-card-wrapper">
          <div className="auth-header">
            <div className="auth-logo">logo</div>
            <h1 className="auth-title">亲子教育 · 成长伴侣</h1>
            <p className="auth-subtitle">专注 0-12 岁亲子教育，科学陪伴每一天</p>
          </div>

          <div className="slider-container">
            <div 
              className={`slider-button ${activeTab === 'register' ? 'slider-button--right' : ''}`}
            ></div>
            <div className="slider-tabs">
              <button
                className={`slider-tab ${activeTab === 'login' ? 'slider-tab--active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                登录
              </button>
              <button
                className={`slider-tab ${activeTab === 'register' ? 'slider-tab--active' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                注册
              </button>
            </div>
          </div>

          {activeTab === 'login' ? (
            <Login onLoginSuccess={handleLoginSuccess} onForgotPassword={handleShowForgotPassword} />
          ) : (
            <Register onRegistered={handleRegistered} />
          )}

          <div className="social-login">
            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">第三方账号登录</span>
              <div className="divider-line"></div>
            </div>
            <div className="oauth-buttons">
              <button
                type="button"
                onClick={() => handleOAuth('wechat')}
                className="oauth-buttons__btn"
                title="微信登录"
              >
                <i className="fab fa-weixin"></i>
              </button>
              <button
                type="button"
                onClick={() => handleOAuth('qq')}
                className="oauth-buttons__btn"
                title="QQ登录"
              >
                <i className="fab fa-qq"></i>
              </button>
              <button
                type="button"
                className="oauth-buttons__btn"
                title="Apple登录"
              >
                <i className="fab fa-apple"></i>
              </button>
            </div>
          </div>

          <div className="auth-footnote">
            <p>注册即表示您同意 <a href="#">《用户协议》</a> 和 <a href="#">《隐私政策》</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 认证相关路由 */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<AuthPage />} />
        
        {/* 受保护的主路由 */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/ai" element={
          <ProtectedRoute>
            <AIPage />
          </ProtectedRoute>
        } />
        <Route path="/mine" element={
          <ProtectedRoute>
            <MinePage />
          </ProtectedRoute>
        } />
        <Route path="/object-recognition" element={
          <ProtectedRoute>
            <ObjectRecognitionPage />
          </ProtectedRoute>
        } />
        <Route path="/learn-words" element={
          <ProtectedRoute>
            <LearnWordsPage />
          </ProtectedRoute>
        } />
        <Route path="/ai-dialogue" element={
          <ProtectedRoute>
            <AIDialoguePage />
          </ProtectedRoute>
        } />
        <Route path="/videos" element={
          <ProtectedRoute>
            <VideoListPage />
          </ProtectedRoute>
        } />
        <Route path="/videos/:id" element={
          <ProtectedRoute>
            <VideoPlayerPage />
          </ProtectedRoute>
        } />

        {/* 默认路由 */}
        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


