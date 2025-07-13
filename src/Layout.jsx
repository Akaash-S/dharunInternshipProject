import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MessageSquare,
  FolderCog,
  Settings,
  LogOut,
} from 'lucide-react';

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      navigate('/');
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const getInitials = (nameOrEmail) => {
    if (!nameOrEmail) return 'U';
    const nameParts = nameOrEmail.trim().split(' ');
    if (nameParts.length > 1) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    } else {
      return nameOrEmail[0]?.toUpperCase();
    }
  };

  const menuItems = [
    { label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/dashboard' },
    { label: 'Chats', icon: <MessageSquare className="w-5 h-5" />, path: '/chats' },
    { label: 'Files', icon: <FolderCog className="w-5 h-5" />, path: '/files' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/settings' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  if (!user) return null;

  return (
    <div className="flex h-screen text-gray-800 bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col justify-between">
        <div>
          <div
            className="text-2xl font-bold text-blue-600 p-6 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            TeamsX
          </div>
          <ul className="space-y-1 px-4">
            {menuItems.map((item) => (
              <li
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors
                  ${isActive(item.path)
                    ? 'bg-blue-100 text-blue-600 border-l-4 border-blue-500 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                  }`}
              >
                {item.icon}
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 m-4 px-4 py-2 rounded-lg border border-red-200"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold">
            Welcome, {user.name || user.email || 'User'} 👋
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {getInitials(user.name || user.email)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name || 'User'}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
