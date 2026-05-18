import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './Toast.less';

let toastInstance = null;

function Toast({ text, icon, duration = 2000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // 等待动画完成
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="taro-toast">
      <div className="taro-toast__overlay"></div>
      <div className="taro-toast__container">
        {icon && (
          <div className={`taro-toast__icon taro-toast__icon--${icon}`}>
            {icon === 'success' && <i className="fas fa-check-circle"></i>}
            {icon === 'error' && <i className="fas fa-times-circle"></i>}
            {icon === 'loading' && <i className="fas fa-spinner fa-spin"></i>}
          </div>
        )}
        <div className="taro-toast__content">{text}</div>
      </div>
    </div>
  );
}

// Toast 工具函数
Toast.show = (options) => {
  if (toastInstance) {
    Toast.hide();
  }

  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  const hide = () => {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    toastInstance = null;
    if (options.onClose) {
      options.onClose();
    }
  };

  toastInstance = { hide, container };

  root.render(
    <Toast
      text={options.text || options.content}
      icon={options.icon}
      duration={options.duration || 2000}
      onClose={hide}
    />
  );

  return { hide };
};

Toast.hide = () => {
  if (toastInstance) {
    toastInstance.hide();
  }
};

export default Toast;

