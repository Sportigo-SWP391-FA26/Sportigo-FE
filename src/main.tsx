import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/index.css';

// Google OAuth phân biệt chính xác origin. Chuẩn hóa địa chỉ dev về localhost
// để link cũ dùng 127.0.0.1 không bị Google Identity Services từ chối 403.
if (import.meta.env.DEV && window.location.hostname === '127.0.0.1') {
  const { protocol, port, pathname, search, hash } = window.location;
  const portSuffix = port ? `:${port}` : '';
  window.location.replace(`${protocol}//localhost${portSuffix}${pathname}${search}${hash}`);
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
