import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept and silence standard HMR/Vite connection closed warnings
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason) {
    const msg = reason.message || String(reason);
    if (
      msg.includes('WebSocket') || 
      msg.includes('connection') || 
      msg.includes('vite') || 
      msg.includes('hmr') || 
      msg.includes('WebSocket closed')
    ) {
      event.preventDefault();
      console.debug('SCM Interceptor: Silenced standard HMR/Vite WebSocket closed rejection.');
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

