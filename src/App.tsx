import { useState, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { LiveSessions } from './pages/LiveSessions';

// Lazy load heavy pages for better performance
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Alerts = lazy(() => import('./pages/Alerts'));  // ✅ FIXED
const GeoMap = lazy(() => import('./pages/GeoMap'));
const BehavioralAnalytics = lazy(() => import('./pages/BehavioralAnalytics'));  // ✅ FIXED
const DataExport = lazy(() => import('./pages/DataExport'));
const Settings = lazy(() => import('./pages/Settings'));
export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingSpinner />}>
            {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
            {currentPage === 'live-sessions' && <LiveSessions />}
            {currentPage === 'analytics' && <Analytics />}
            {currentPage === 'alerts' && <Alerts />}
            {currentPage === 'geomap' && <GeoMap />}
            {currentPage === 'behavior' && <BehavioralAnalytics />}
            {currentPage === 'export' && <DataExport />}
            {currentPage === 'settings' && <Settings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
    </div>
  );
}