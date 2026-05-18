import React from 'react';

function ObjectRecognitionResult({ data, onVoiceBroadcast, isVoicePlaying }) {
  if (!data) return null;

  return (
    <section className="object-recognition-result result-container">
      <div className="object-recognition-result__header">
        <h2>识别结果</h2>
        <button 
          className="object-recognition-result__voice" 
          onClick={() => onVoiceBroadcast(`这是${data.name}，属于${data.category}。${data.description}。${data.safetyTips}`)}
          aria-label={isVoicePlaying ? "停止语音播报" : "语音播报"}
        >
          <i className={isVoicePlaying ? "fas fa-stop" : "fas fa-volume-up"}></i>
        </button>
      </div>
      
      <div className="object-recognition-result__content">
        <div className="object-recognition-result__name">
          <h3>{data.name}</h3>
          <span className="object-recognition-result__category">{data.category}</span>
        </div>
        
        <div className="object-recognition-result__pronunciation">
          <i className="fas fa-volume-down"></i>
          <span>{data.pronunciation}</span>
        </div>
        
        <div className="object-recognition-result__description">
          <h4>物品介绍</h4>
          <p>{data.description}</p>
        </div>
        
        <div className="object-recognition-result__safety">
          <h4>安全提示</h4>
          <p>{data.safetyTips}</p>
        </div>
      </div>
    </section>
  );
}

export default ObjectRecognitionResult;