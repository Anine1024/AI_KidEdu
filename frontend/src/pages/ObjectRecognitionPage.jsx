import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/objectRecognition.less';
import BottomNavigation from '../components/BottomNavigation';
import ImageCaptureAndProcess from '../components/ImageCaptureAndProcess';
import ObjectRecognitionResult from '../components/ObjectRecognitionResult';

// 从环境变量中获取API token
const API_TOKEN = import.meta.env.VITE_COZE_IMAGE_TO_TEXT_AND_VOICE || import.meta.env.COZE_IMAGE_TO_TEXT_AND_VOICE;

function ObjectRecognitionPage() {
  const [activeTab, setActiveTab] = useState('home');
  const [recognitionResult, setRecognitionResult] = useState(null);

  // 真实AI识别API调用
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
        body: JSON.stringify({ image: dataUrl })
      });
      
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
      
      // 解析响应数据
      const data = await response.json();
      
      // 假设API返回的结构如下，需要根据实际API响应调整
      // { name: '物品名称', category: '类别', description: '描述', safetyTips: '安全提示', pronunciation: '发音' }
      const recognitionData = {
        name: data.name || '未知物品',
        category: data.category || '未知类别',
        description: data.description || '暂无描述信息',
        safetyTips: data.safetyTips || '暂无安全提示',
        pronunciation: data.pronunciation || '',
        // 如果API返回语音资源URL，可以保存下来
        voiceUrl: data.voiceUrl || ''
      };
      
      setRecognitionResult(recognitionData);
      return recognitionData;
    } catch (err) {
      console.error('AI识别失败:', err);
      throw err; // 重新抛出错误，让组件处理
    }
  };
  
  return (
    <>
      <ImageCaptureAndProcess 
        title="AI 拍照识物"
        onRecognition={realRecognition}
        resultComponent={ObjectRecognitionResult}
        resultData={recognitionResult}
        theme="default"
        className="object-recognition-page"
      />
      
      <BottomNavigation activeTab={activeTab} />
    </>
  );
}

export default ObjectRecognitionPage;
