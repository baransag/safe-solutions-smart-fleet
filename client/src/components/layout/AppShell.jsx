import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';
import FloatingHelp from '../common/FloatingHelp';
import AppUserGuideModal from '../common/AppUserGuideModal';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handleOpenGuide = () => setGuideOpen(true);
    window.addEventListener('app:open-guide', handleOpenGuide);
    return () => window.removeEventListener('app:open-guide', handleOpenGuide);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-content">
        <Header onMenuClick={() => setSidebarOpen(true)} onOpenGuide={() => setGuideOpen(true)} />
        <main>
          <Outlet />
        </main>
      </div>

      <MobileNav />
      <FloatingHelp onOpenGuide={() => setGuideOpen(true)} />
      <AppUserGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
