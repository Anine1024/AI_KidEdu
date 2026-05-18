import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.less';
import BottomNavigation from '../components/BottomNavigation';


function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();
  


  const quickEntries = [
    { title: '拍照识实物', desc: '秒识身边物品，讲解用途与安全提示', tag: 'AI 识别' },
    { title: '拍照学单词', desc: '看图记单词，语音跟读巩固记忆', tag: '英语' },
    { title: '古诗词天地', desc: '每日一诗，图文+朗读，助力语文启蒙', tag: '国学' },
    { title: '亲子成长任务', desc: '每日 3 个小目标，亲子打卡养习惯', tag: '习惯养成' },
    { title: '睡前故事馆', desc: 'AI 讲故事，个性化选择角色与情节', tag: '故事' },
    { title: '科学小实验', desc: '安全材料，动手做实验，培养好奇心', tag: '科普' }
  ];

  return (
    <div className="home-root">
      <header className="home-hero">
        <div>
          <p className="home-hero__eyebrow">亲子教育 · 科学陪伴</p>
          <h1>和孩子一起，探索更大的世界</h1>
          <p className="home-hero__sub">
            AI + 内容，拍照识物、学单词、听诗词、做实验，陪伴每个好奇瞬间
          </p>
          <div className="home-hero__actions">
            <button className="home-btn home-btn--primary">开始探索</button>
          </div>
        </div>
        <div className="home-hero__bubble">
          <span>AI 讲解</span>
          <span>口语跟读</span>
          <span>安全提示</span>
          <span>朗读诗词</span>
          <span>亲子任务</span>
        </div>
      </header>

      <section className="home-section">
        <div className="home-section__head">
          <div>
            <p className="home-section__eyebrow">快捷入口</p>
            <h2>把学习融入日常场景</h2>
            <p className="home-section__desc">随手拍、随时学；听故事、背诗词；动手实验，护眼护耳朵</p>
          </div>
          <button className="home-btn home-btn--text">查看全部</button>
        </div>
        <div className="home-grid">
          {quickEntries.map((item) => (
            <div key={item.title} className="home-card">
              <div className="home-card__tag">{item.tag}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <button 
                className="home-btn home-btn--small" 
                onClick={() => {
                  if (item.title === '拍照识实物') {
                    navigate('/object-recognition');
                  } else if (item.title === '拍照学单词') {
                    navigate('/learn-words');
                  }
                }}
              >
                进入
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head">
          <div>
            <p className="home-section__eyebrow">今日推荐</p>
            <h2>精选亲子学习组合</h2>
            <p className="home-section__desc">语文 + 英语 + 科普，平衡孩子的认知与兴趣</p>
          </div>
        </div>
        <div className="home-recos">
          <div className="home-recos__item">
            <div>
              <h3>《春晓》配图 + 朗诵</h3>
              <p>图文并茂、分句朗读，孩子更易理解意境</p>
            </div>
            <button className="home-btn home-btn--small">听一听</button>
          </div>
          <div className="home-recos__item">
            <div>
              <h3>拍照识动物，讲安全</h3>
              <p>户外遇到的小动物，秒识别并提示安全距离</p>
            </div>
            <button className="home-btn home-btn--small" onClick={() => navigate('/object-recognition')}>去拍照</button>
          </div>
          <div className="home-recos__item">
            <div>
              <h3>英语自然拼读小课</h3>
              <p>短时互动课程 + 跟读打分，口语好开口</p>
            </div>
            <button className="home-btn home-btn--small">开始学习</button>
          </div>
        </div>
      </section>
      <BottomNavigation activeTab={activeTab} />
    </div>
  );
}

export default Home;




