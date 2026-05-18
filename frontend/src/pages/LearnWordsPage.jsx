import React, { useState } from 'react';
import '../styles/learnWords.less';
import BottomNavigation from '../components/BottomNavigation';
import ImageCaptureAndProcess from '../components/ImageCaptureAndProcess';
import WordLearningResult from '../components/WordLearningResult';

// 从环境变量中获取API token
const API_TOKEN = import.meta.env.VITE_COZE_IMAGE_TO_WORD || import.meta.env.COZE_IMAGE_TO_WORD;

function LearnWordsPage() {
  const [activeTab, setActiveTab] = useState('home');
  const [learningResult, setLearningResult] = useState(null);

  // 真实AI识别API调用（学习单词）
  const realRecognition = async (file) => {
    try {
      // 检查API token是否存在
      if (!API_TOKEN) {
        throw new Error('API token 未配置，请检查环境变量');
      }
      
      // 将图片转换为完整的data URL格式
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); // 保留完整的data URL格式
        reader.onerror = error => reject(error);
      });
      
      // 调用Coze API（通过Vite代理）
      const response = await fetch('/coze-api/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          image: dataUrl,
          manual_description: ""
        })
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
      
      // 解析响应数据
      const data = await response.json();
      
      // 假设API返回的结构如下，需要根据实际API响应调整
      // { word: 'apple', pronunciation: 'æpəl', definition: '苹果', example1: 'I eat an apple every day.', example2: 'The apple tree is blooming.' }
      const learningData = {
        word: data.word || '未知单词',
        pronunciation: data.pronunciation || '暂无发音',
        definition: data.definition || '暂无定义',
        example1: data.example1 || '暂无例句1',
        example2: data.example2 || '暂无例句2',
        // 如果API返回语音资源URL，可以保存下来
        voiceUrl: data.voiceUrl || ''
      };
      
      setLearningResult(learningData);
      return learningData;
    } catch (err) {
      console.error('学习单词失败:', err);
      throw err; // 重新抛出错误，让组件处理
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
      />
      
      <BottomNavigation activeTab={activeTab} />
    </>
  );
}

export default LearnWordsPage;