import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/minePage.less';
import BottomNavigation from '../components/BottomNavigation';

const USER_INFO_KEY = 'user_info';
const AUTH_TOKEN_KEY = 'auth_token';

function MinePage() {
  const [activeTab, setActiveTab] = useState('mine');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 先从 localStorage 读取缓存的用户信息（即时显示）
    const cached = localStorage.getItem(USER_INFO_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (e) {
        // ignore parse error
      }
    }

    // 再从后端获取最新用户信息，同步到本地
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // 网络异常时使用缓存数据，不做处理
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_expires_at');
    localStorage.removeItem(USER_INFO_KEY);
    navigate('/login');
  };

  return (
    <div className="mine-page-root">
      <header className="mine-page-header">
        <div className="user-info">
          <div className="user-avatar">
            <i className="fas fa-user"></i>
          </div>
          <div className="user-details">
            <h2>{user?.nickname || '我的账户'}</h2>
            <p>{user?.phone || '亲子教育AI助手用户'}</p>
          </div>
        </div>
      </header>

      <section className="mine-page-content">
        <div className="mine-section">
          <h3 className="mine-section-title">我的内容</h3>
          <div className="mine-item">
            <i className="fas fa-bookmark"></i>
            <span>我的收藏</span>
            <i className="fas fa-chevron-right"></i>
          </div>
          <div className="mine-item">
            <i className="fas fa-history"></i>
            <span>浏览历史</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>

        <div className="mine-section">
          <h3 className="mine-section-title">设置</h3>
          <div className="mine-item">
            <i className="fas fa-cog"></i>
            <span>账号设置</span>
            <i className="fas fa-chevron-right"></i>
          </div>
          <div className="mine-item">
            <i className="fas fa-bell"></i>
            <span>通知设置</span>
            <i className="fas fa-chevron-right"></i>
          </div>
          <div className="mine-item">
            <i className="fas fa-question-circle"></i>
            <span>帮助中心</span>
            <i className="fas fa-chevron-right"></i>
          </div>
          <div className="mine-item mine-item--logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>退出登录</span>
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </section>

      <BottomNavigation activeTab={activeTab} />
    </div>
  );
}

export default MinePage;
