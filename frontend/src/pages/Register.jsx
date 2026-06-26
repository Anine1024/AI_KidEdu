import React, { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import '../styles/register.less';

function Register({ onRegistered }) {
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 加载图形验证码
  const loadCaptcha = async () => {
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (res.ok && data.captchaId && data.captchaSvg) {
        setCaptchaId(data.captchaId);
        setCaptchaSvg(data.captchaSvg);
      }
    } catch (err) {
      console.error('加载验证码失败:', err);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nickname || !phone || !captchaCode || !password) {
      setError('请填写完整信息');
      Toast.show({
        text: '请填写完整信息',
        icon: 'error',
        duration: 2000
      });
      return;
    }
    
    // 手机号格式校验
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      setError('请输入正确的手机号格式');
      Toast.show({
        text: '请输入正确的手机号格式',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, nickname, captchaId, captchaCode })
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error('服务器返回异常（非 JSON）');
      }

      if (!res.ok) {
        throw new Error(data.message || '注册失败');
      }

      // 显示成功提示
      Toast.show({
        text: '注册成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟一下再切换，让用户看到成功提示
      setTimeout(() => {
        if (typeof onRegistered === 'function') {
          onRegistered();
        }
      }, 500);
    } catch (err) {
      setError(err.message || '注册失败，请稍后再试');
      Toast.show({
        text: err.message || '注册失败，请稍后再试',
        icon: 'error',
        duration: 2000
      });
      // 验证失败后刷新验证码
      if (err.message.includes('验证码')) {
        loadCaptcha();
        setCaptchaCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="register-form" onSubmit={handleSubmit}>
        <div className="register-form__group">
          <i className="fas fa-user register-form__icon"></i>
          <input
            type="text"
            placeholder="请输入昵称"
            className="register-form__input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="register-form__group">
          <i className="fas fa-phone-alt register-form__icon"></i>
          <input
            type="tel"
            placeholder="请输入手机号"
            className="register-form__input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="register-form__group register-form__group--captcha">
          <i className="fas fa-shield-alt register-form__icon"></i>
          <input
            type="text"
            placeholder="请输入验证码"
            className="register-form__input register-form__input--captcha"
            value={captchaCode}
            onChange={(e) => setCaptchaCode(e.target.value)}
            maxLength={4}
          />
          <div
            className="register-form__captcha-img"
            onClick={loadCaptcha}
            title="点击刷新验证码"
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
        </div>

        <div className="register-form__group">
          <i className="fas fa-lock register-form__icon"></i>
          <input
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder="请设置密码"
            className="register-form__input register-form__input--password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="register-form__eye-toggle"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            aria-label={isPasswordVisible ? '隐藏密码' : '显示密码'}
          >
            {isPasswordVisible ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            )}
          </button>
        </div>

        {error && (
          <div className="register-form__error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="register-form__submit"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
    </div>
  );
}

export default Register;
