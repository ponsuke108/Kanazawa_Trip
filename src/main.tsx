import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
// （v18）書体（7.2、7.9）。どちらも SIL Open Font License。unicode-range で、使う文字の分だけ読み込む
import '@fontsource/shippori-mincho/400.css';
import '@fontsource/shippori-mincho/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/700.css';
import '@/styles/global.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('#root が見つかりません');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
