import { 
  Shield, Activity, TrendingUp, AlertTriangle, 
  Brain, Download, Settings, ChevronRight, X, BarChart3 
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  currentPage: string;
  onNavigate: (page: string) => void;
  onToggle: () => void;
  userRole?: 'admin' | 'member'; // ✅ NEW: Add userRole prop
}

export function Sidebar({ collapsed, currentPage, onNavigate, onToggle, userRole }: SidebarProps) {
  // ✅ MODIFIED: Filter out settings if user is not admin
  const allNavItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'live-sessions', icon: Activity, label: 'Live Sessions' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'alerts', icon: AlertTriangle, label: 'Alerts' },
    { id: 'behavior', icon: Brain, label: 'Behavior' },
    { id: 'export', icon: Download, label: 'Data Export' },
    { id: 'settings', icon: Settings, label: 'Settings', adminOnly: true } // ✅ NEW: Mark as admin only
  ];

  // ✅ NEW: Filter nav items based on user role
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly) {
      return userRole === 'admin';
    }
    return true;
  });

  return (
    <aside
      style={{ width: collapsed ? 80 : 280 }}
      className="bg-white border-r border-gray-200 flex flex-col shadow-lg transition-all duration-300"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary-500" />
            <span className="font-bold text-lg text-gray-800">Honeypot</span>
          </div>
        )}
        {collapsed && <Shield className="w-8 h-8 text-primary-500 mx-auto" />}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              currentPage === item.id
                ? 'bg-gradient-to-r from-primary-500 to-blue-500 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="h-12 border-t border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </button>
    </aside>
  );
}