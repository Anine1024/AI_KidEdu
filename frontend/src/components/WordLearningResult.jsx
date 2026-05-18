import React from 'react';

function WordLearningResult({ data, onVoiceBroadcast, isVoicePlaying }) {
  if (!data) return null;

  return (
    <section className="word-learning-result result-container">
      <div className="word-learning-result__header">
        <h2>学习结果</h2>
        <button 
          className="word-learning-result__voice" 
          onClick={() => onVoiceBroadcast(`${data.word}. ${data.pronunciation}. ${data.definition}. ${data.example1}. ${data.example2}`)}
          aria-label={isVoicePlaying ? "停止语音播报" : "语音播报"}
        >
          <i className={isVoicePlaying ? "fas fa-stop" : "fas fa-volume-up"}></i>
        </button>
      </div>
      
      <div className="word-learning-result__content">
        <div className="word-learning-result__word">
          <h3>{data.word}</h3>
          <span className="word-learning-result__pronunciation">{data.pronunciation}</span>
        </div>
        
        <div className="word-learning-result__definition">
          <h4>定义</h4>
          <p>{data.definition}</p>
        </div>
        
        <div className="word-learning-result__examples">
          <h4>例句</h4>
          <div className="word-learning-result__example">
            <span className="word-learning-result__example-number">1.</span>
            <p>{data.example1}</p>
          </div>
          <div className="word-learning-result__example">
            <span className="word-learning-result__example-number">2.</span>
            <p>{data.example2}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WordLearningResult;