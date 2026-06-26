import { useState } from 'react';
import Toast from '../components/Toast';
import '../styles/login.less';



function Login({ onLoginSuccess, onForgotPassword }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const toggleVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error('服务器返回异常（非 JSON）');
      }

      if (!res.ok) {
        throw new Error(data.message || '登录失败');
      }

      if (!data.token) {
        throw new Error('未获取到登录凭证');
      }

      // 显示成功提示
      Toast.show({
        text: '登录成功',
        icon: 'success',
        duration: 2000
      });

      // 延迟一下再跳转，让用户看到成功提示
      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') {
          onLoginSuccess(data.token, data.user);
        }
      }, 500);
    } catch (err) {
      setError(err.message || '登录失败，请稍后再试');
      Toast.show({
        text: err.message || '登录失败，请稍后再试',
        icon: 'error',
        duration: 2000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form__group">
          <i className="fas fa-user auth-form__icon"></i>
          <input
            type="tel"
            placeholder="请输入手机号或邮箱"
            className="auth-form__input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="auth-form__group">
          <i className="fas fa-lock auth-form__icon"></i>
          <input
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder="请输入密码"
            className="auth-form__input auth-form__input--password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="auth-form__eye-toggle"
            onClick={toggleVisibility}
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

        <div className="auth-form__forgot-wrapper">
          <a
            href="#"
            className="auth-form__forgot"
            onClick={(e) => {
              e.preventDefault();
              if (typeof onForgotPassword === 'function') {
                onForgotPassword();
              }
            }}
          >
            忘记密码？
          </a>
        </div>

        {error && (
          <div className="auth-form__error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="auth-form__submit"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}

export default Login;
