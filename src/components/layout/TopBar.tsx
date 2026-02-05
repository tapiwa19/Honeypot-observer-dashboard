
        

      import { Menu, User, LogOut,  } from 'lucide-react';
import { useState } from 'react';

interface TopBarProps {
  onMenuClick: () => void;
  currentUser?: {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'member';
  } | null; // ✅ NEW: Add currentUser prop
  onLogout?: () => void; // ✅ NEW: Add onLogout prop
}

export function TopBar({ onMenuClick, currentUser, onLogout }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false); // ✅ NEW: User menu state

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Honeypot Observer</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">All Systems Operational</span>
        </div>

        {/* ✅ NEW: User Menu */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-900">
                  {currentUser.username}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {currentUser.role}
                </div>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserMenu(false)}
                />
                
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">
                      {currentUser.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {currentUser.email}
                    </div>
                    <div className="text-xs text-gray-400 mt-1 capitalize">
                      Role: {currentUser.role}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      // You can add profile navigation here if needed
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition flex items-center gap-2 text-gray-700"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  
                  <hr className="my-2" />
                  
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout?.();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-red-50 transition flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}