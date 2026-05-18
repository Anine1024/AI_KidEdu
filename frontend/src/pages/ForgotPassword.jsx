import React, { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import '../styles/forgotPassword.less';

function ForgotPassword({ onBack }) {
  const [phone, setPhone] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !captchaCode || !newPassword || !confirmPassword) {
      setError('请填写完整信息');
      Toast.show({
        text: '请填写完整信息',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      Toast.show({
        text: '两次输入的密码不一致',
        icon: 'error',
        duration: 2000
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, captchaId, captchaCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '重置密码失败');
      }

      // 显示成功提示
      Toast.show({
        text: '密码重置成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟一下再返回，让用户看到成功提示
      setTimeout(() => {
        if (typeof onBack === 'function') {
          onBack();
        }
      }, 500);
    } catch (err) {
      setError(err.message || '重置密码失败，请稍后再试');
      Toast.show({
        text: err.message || '重置密码失败，请稍后再试',
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
    <div className="forgot-password">
      <div className="forgot-password__header">
        <button
          type="button"
          className="forgot-password__back"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="forgot-password__title">忘记密码</h2>
      </div>

      <form className="forgot-password__form" onSubmit={handleResetPassword}>
        <p className="forgot-password__hint">
          请输入您的手机号和新密码
        </p>

        <div className="forgot-password__form-group">
          <i className="fas fa-phone-alt forgot-password__icon"></i>
          <input
            type="tel"
            placeholder="请输入手机号"
            className="forgot-password__input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="forgot-password__form-group forgot-password__form-group--captcha">
          <i className="fas fa-shield-alt forgot-password__icon"></i>
          <input
            type="text"
            placeholder="请输入验证码"
            className="forgot-password__input forgot-password__input--captcha"
            value={captchaCode}
            onChange={(e) => setCaptchaCode(e.target.value)}
            maxLength={4}
          />
          <div
            className="forgot-password__captcha-img"
            onClick={loadCaptcha}
            title="点击刷新验证码"
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
        </div>

        <div className="forgot-password__form-group">
          <i className="fas fa-lock forgot-password__icon"></i>
          <input
            type="password"
            placeholder="请设置新密码"
            className="forgot-password__input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="forgot-password__form-group">
          <i className="fas fa-lock forgot-password__icon"></i>
          <input
            type="password"
            placeholder="请再次输入新密码"
            className="forgot-password__input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="forgot-password__error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="forgot-password__submit"
        >
          {loading ? '重置中...' : '重置密码'}
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;
