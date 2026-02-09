import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 注册Service Worker（PWA支持）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// 微信浏览器检测
const isWechat = /MicroMessenger/i.test(navigator.userAgent);
if (isWechat) {
  console.log('微信浏览器 detected');
  document.body.classList.add('wechat-browser');
}

// 阻止默认触摸行为（防止录音时页面滚动）
document.addEventListener('touchmove', (e) => {
  if (document.body.classList.contains('recording')) {
    e.preventDefault();
  }
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
