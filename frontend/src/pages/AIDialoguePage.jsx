import React, { useState, useRef, useEffect } from 'react';
import '../styles/aiDialogue.less';

function AIDialoguePage() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 模拟AI回复
  const getAIResponse = (userMessage) => {
    const responses = [
      '你好呀！我是你的AI小伙伴，有什么可以帮助你的吗？',
      '这个问题很有趣呢！让我想想...',
      '我明白了，你是想了解这个吗？',
      '哇，你知道的真多！',
      '这是一个很好的问题，让我来为你解答。',
      '哈哈，你真有趣！',
      '我理解你的意思了。',
      '让我再仔细考虑一下...',
      '你说得对！',
      '这是一个很棒的想法！'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // 模拟AI回复延迟
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        text: getAIResponse(inputText),
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  // 处理键盘发送
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        convertSpeechToText(audioBlob);
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('录音失败:', error);
      alert('录音失败，请确保已授予麦克风权限');
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 语音转文字（模拟功能，实际项目中需要调用语音识别API）
  const convertSpeechToText = (audioBlob) => {
    setIsLoading(true);
    
    // 模拟语音识别延迟
    setTimeout(() => {
      // 模拟识别结果
      const mockTexts = [
        '你好，AI小伙伴！',
        '今天天气怎么样？',
        '告诉我一个有趣的故事吧',
        '数学题怎么做？',
        '推荐一本好书',
        '你会做什么？',
        '再见'
      ];
      
      const recognizedText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      setInputText(recognizedText);
      setIsLoading(false);
    }, 1500);
  };

  // 处理语音按钮点击
  const handleVoiceClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="ai-dialogue-root">
      <header className="ai-dialogue-header">
        <div className="ai-dialogue-header__back" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left"></i>
        </div>
        <h1>智能对话</h1>
        <div className="ai-dialogue-header__more">
          <i className="fas fa-ellipsis-v"></i>
        </div>
      </header>

      <main className="ai-dialogue-main">
        <div className="ai-dialogue-messages">
          {/* 欢迎消息 */}
          {messages.length === 0 && (
            <div className="ai-dialogue-welcome">
              <i className="fas fa-robot ai-dialogue-avatar"></i>
              <p>你好！我是你的AI小伙伴，有什么想聊的吗？</p>
            </div>
          )}

          {/* 消息列表 */}
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`ai-dialogue-message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}
            >
              <div className="ai-dialogue-message__content">
                <div className="ai-dialogue-message__text">{message.text}</div>
                <div className="ai-dialogue-message__time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {message.sender === 'ai' && (
                <div className="ai-dialogue-avatar ai-avatar">
                  <i className="fas fa-robot"></i>
                </div>
              )}
            </div>
          ))}

          {/* 加载中的AI回复 */}
          {isLoading && (
            <div className="ai-dialogue-message ai-message">
              <div className="ai-dialogue-message__content">
                <div className="ai-dialogue-loading">
                  <div className="ai-dialogue-loading__dot"></div>
                  <div className="ai-dialogue-loading__dot"></div>
                  <div className="ai-dialogue-loading__dot"></div>
                </div>
              </div>
              <div className="ai-dialogue-avatar ai-avatar">
                <i className="fas fa-robot"></i>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="ai-dialogue-footer">
        <div className="ai-dialogue-input-container">
          <textarea
            className="ai-dialogue-input"
            placeholder="输入消息..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <div className="ai-dialogue-actions">
            <button 
              className={`ai-dialogue-voice-btn ${isRecording ? 'recording' : ''}`}
              onClick={handleVoiceClick}
              aria-label={isRecording ? '停止录音' : '开始录音'}
              disabled={isLoading}
            >
              <i className={isRecording ? "fas fa-stop" : "fas fa-microphone"}></i>
            </button>
            <button 
              className="ai-dialogue-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
        {isRecording && (
          <div className="ai-dialogue-recording-indicator">
            <div className="ai-dialogue-recording-dot"></div>
            <span>正在录音...</span>
          </div>
        )}
      </footer>
    </div>
  );
}

export default AIDialoguePage;
