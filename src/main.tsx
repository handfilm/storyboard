import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StudioErrorBoundary } from './components/StudioErrorBoundary';
import { serviceWorkerManager } from './services/serviceWorkerManager';
import './index.css';

// Initialize Service Worker for Storyboard Media Vault caching and range requests
serviceWorkerManager.init();

createRoot(document.getElementById('root')!).render(
  <StudioErrorBoundary>
    <App />
  </StudioErrorBoundary>
);

