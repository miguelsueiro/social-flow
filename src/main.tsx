import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {MotionConfig} from 'motion/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user" makes every Framer Motion animation in the app
        (12 files import motion/react) respect prefers-reduced-motion
        automatically — instant transitions instead of animated ones, same
        outcome as index.css's own reduced-motion block already gives the
        CSS-driven animations, which can't reach Framer's separately. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
