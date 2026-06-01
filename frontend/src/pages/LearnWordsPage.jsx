import React, { useState, useRef } from 'react';
import '../styles/learnWords.less';
import BottomNavigation from '../components/BottomNavigation';
import ImageCaptureAndProcess from '../components/ImageCaptureAndProcess';
import WordLearningResult from '../components/WordLearningResult';

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const MAX = 1500;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function LearnWordsPage() {
  const [activeTab, setActiveTab] = useState('home');
  const [learningResult, setLearningResult] = useState(null);
  const [progressText, setProgressText] = useState('AI 识别中');
  const timerRef = useRef(null);

  const handleClear = () => setLearningResult(null);

  const realRecognition = async (file) => {
    setProgressText('正在压缩图片…');
    const dataUrl = await compressImage(file);

    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds++;
      setProgressText(`AI 正在识别…  ${seconds}s`);
    }, 1000);

    try {
      const res = await fetch('/api/ai/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, type: 'word' }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `请求失败: ${res.status}`);
      }

      const result = await res.json();
      if (!result.success) throw new Error(result.message || '识别失败');

      setProgressText(`识别完成 (${seconds}s)`);
      setLearningResult(result.data);
      return result.data;
    } finally {
      clearInterval(timerRef.current);
    }
  };

  return (
    <>
      <ImageCaptureAndProcess
        title="拍照学单词"
        onRecognition={realRecognition}
        resultComponent={WordLearningResult}
        resultData={learningResult}
        theme="green"
        className="learn-words-page"
        onClear={handleClear}
        progressText={progressText}
      />
      <BottomNavigation activeTab={activeTab} />
    </>
  );
}

export default LearnWordsPage;
