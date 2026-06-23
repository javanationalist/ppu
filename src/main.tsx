import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error suppressor to handle benign cross-origin errors, 
// fullscreen restrictions, and media query/camera API blocks in sandboxed iframes.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Suppress cross-origin "Script error." and fullscreen/media/camera permission errors in iframes
    if (
      event.message?.includes('Script error.') || 
      event.message?.includes('fullscreen') || 
      event.message?.includes('camera') ||
      event.message?.includes('Permission denied')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Suppressed sandboxed iframe restriction error:', event.message);
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason);
    if (
      reason.includes('fullscreen') || 
      reason.includes('camera') || 
      reason.includes('Permission') || 
      reason.includes('NotAllowedError') ||
      reason.includes('Script error.')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Suppressed sandboxed iframe unhandled promise rejection:', reason);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

