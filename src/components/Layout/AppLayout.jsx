import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { getUserSettings } from '../../utils/storage';

export default function AppLayout() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    let mounted = true;
    getUserSettings(user.username).then(settings => {
      if (!mounted) return;
      setTheme(settings.theme || 'light');
    });

    const handleThemeChange = (event) => {
      setTheme(event.detail?.theme || 'light');
    };
    window.addEventListener('app-theme-change', handleThemeChange);

    return () => {
      mounted = false;
      window.removeEventListener('app-theme-change', handleThemeChange);
    };
  }, [user.username]);

  return (
    <div className="app-layout" data-theme={theme}>
      <Sidebar />
      <main className="canvas-area">
        <div className="canvas-content custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
