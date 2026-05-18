import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/aiPage.less';
import BottomNavigation from '../components/BottomNavigation';

function AIPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const navigate = useNavigate();

  return (
    <div className="ai-page-root">
      <header className="ai-page-header">
        <h1>AI小伙伴</h1>
        <p>让AI陪伴孩子成长</p>
      </header>

      <section className="ai-page-content">
        <div className="ai-feature-card" onClick={() => navigate('/ai-dialogue')} style={{ cursor: 'pointer' }}>
          <i className="fas fa-robot ai-feature-icon"></i>
          <h3>智能对话</h3>
          <p>AI陪孩子聊天，解答各种问题</p>
        </div>
        <div className="ai-feature-card">
          <i className="fas fa-book-open ai-feature-icon"></i>
          <h3>知识问答</h3>
          <p>涵盖科学、历史、数学等多领域</p>
        </div>
        <div className="ai-feature-card">
          <i className="fas fa-microphone ai-feature-icon"></i>
          <h3>语音交互</h3>
          <p>支持语音输入，更适合孩子使用</p>
        </div>
      </section>

      <BottomNavigation activeTab={activeTab} />
    </div>
  );
}

export default AIPage;
