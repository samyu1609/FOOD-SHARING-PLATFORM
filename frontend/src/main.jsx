import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import api from './api.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered:', registration);
      
      // We delay subscription slightly to ensure token is in localStorage
      setTimeout(async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BEl62iENl1pQ11yVfS14Q_6rVfK3y1QzM1s9Q18r12s_Q18Q18rVfK3y1QzM1s9Q18r12s' // Must match backend publicVapidKey
            });
            await api.post('/user/push-subscribe', { subscription });
            console.log('Push Subscribed');
          } catch (e) {
            console.log('Push subscription failed:', e.message);
          }
        }
      }, 3000);
      
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  });
}
