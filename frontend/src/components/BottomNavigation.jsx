import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BottomNavigation.less';

function BottomNavigation({ activeTab }) {
  const navigate = useNavigate();
  const tabs = [
    { id: 'home', name: '首页', icon: 'home' },
    { id: 'ai', name: 'AI小伙伴', icon: 'robot', isHighlighted: true },
    { id: 'mine', name: '我的', icon: 'user' }
  ];
  
  const handleTabClick = (tabId) => {
    // 页面跳转逻辑
    switch (tabId) {
      case 'home':
        navigate('/');
        break;
      case 'ai':
        navigate('/ai');
        break;
      case 'mine':
        navigate('/mine');
        break;
      default:
        navigate('/');
    }
  };
  
  return (
    <div className="bottom-navigation">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`bottom-navigation__item ${activeTab === tab.id ? 'active' : ''} ${tab.isHighlighted ? 'highlighted' : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          <div className="bottom-navigation__icon-container">
            <i className={`fas fa-${tab.icon}`}></i>
          </div>
          <span className="bottom-navigation__label">{tab.name}</span>
        </div>
      ))}
    </div>
  );
}

export default BottomNavigation;
