import { useState, lazy, Suspense, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { LiveSessions } from './pages/LiveSessions';
import { Login } from './pages/login';  
import { Register } from './pages/Register';

// Lazy load heavy pages for better performance
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Alerts = lazy(() => import('./pages/Alerts'))
const BehavioralAnalytics = lazy(() => import('./pages/BehavioralAnalytics'));
const DataExport = lazy(() => import('./pages/DataExport'));
const Settings = lazy(() => import('./pages/Settings'));

// ✅ NEW: Define User type
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // ✅ NEW: Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  // ✅ NEW: Check if user is already logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // ✅ NEW: Handle successful login
  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  // ✅ NEW: Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  // ✅ NEW: Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ NEW: Show login page if not authenticated
 if (!isAuthenticated) {
  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />;
  }
  return <Login onLoginSuccess={handleLoginSuccess} onShowRegister={() => setShowRegister(true)} />;
}

  // Only show settings to admin users
  const shouldShowSettings = currentUser?.role === 'admin';

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        // ✅ NEW: Pass user role to hide settings for non-admins
        userRole={currentUser?.role}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar 
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          // ✅ NEW: Pass user info and logout handler to TopBar
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<LoadingSpinner />}>
            {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
            {currentPage === 'live-sessions' && <LiveSessions />}
            {currentPage === 'analytics' && <Analytics />}
            {currentPage === 'alerts' && <Alerts />}
            {currentPage === 'behavior' && <BehavioralAnalytics />}
            {currentPage === 'export' && <DataExport />}
            {/* ✅ NEW: Only show settings if user is admin */}
            {currentPage === 'settings' && shouldShowSettings && <Settings />}
            {currentPage === 'settings' && !shouldShowSettings && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-xl text-gray-600">Access Denied</p>
                  <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
                </div>
              </div>
            )}
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