import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/minePage.less';
import BottomNavigation from '../components/BottomNavigation';

function MinePage() {
  const [activeTab, setActiveTab] = useState('mine');
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_expires_at');
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
            <h2>我的账户</h2>
            <p>亲子教育AI助手用户</p>
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
