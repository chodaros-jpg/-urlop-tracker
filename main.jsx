import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Polyfill window.storage using localStorage for standalone deployment
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(key)
      return value ? { key, value } : null
    },
    set: async (key, value) => {
      localStorage.setItem(key, value)
      return { key, value }
    },
    delete: async (key) => {
      localStorage.removeItem(key)
      return { key, deleted: true }
    },
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
