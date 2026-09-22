import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './router';
import { useSessionStore } from './stores/sessionStore';
import './styles.css';

// 先确定当前角色（后端在线则换取访客 JWT，离线则使用本地 mock），再挂载路由守卫
void useSessionStore.getState().init().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
});
