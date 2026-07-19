import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './context/store';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SOPBrowser } from './pages/SOPBrowser';
import { SOPCreate } from './pages/SOPCreate';
import { SOPView } from './pages/SOPView';
import { PendingReviews } from './pages/PendingReviews';
import { UserManager } from './pages/UserManager';
import { AuditLogs } from './pages/AuditLogs';
import { Profile } from './pages/Profile';
import { MyLibrary } from './pages/MyLibrary';
import { Bell, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

// Wrapper to require auth
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredPermission?: string }> = ({ children, requiredPermission }) => {
  const { isAuthenticated, isInitialized, user } = useAppStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712]">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin mb-4" />
        <span className="text-sm font-medium text-slate-400 animate-pulse">Initializing Session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && user && !user.permissions.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Layout component wrapping logged-in views
const Layout: React.FC = () => {
  const { user, notifications, fetchNotifications, markNotificationRead } = useAppStore();
  const [showNotifications, setShowNotifications] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 60s as a fallback
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100 selection:bg-primary-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/40 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/20">
              PROD ENV
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notification Bell */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-primary-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-[#030712] animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl shadow-black/80 z-50 p-2 max-h-[400px] overflow-y-auto">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => useAppStore.getState().markAllNotificationsRead()} 
                      className="text-[10px] text-primary-400 hover:underline font-semibold"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No active notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif._id}
                      onClick={() => {
                        markNotificationRead(notif._id);
                        setShowNotifications(false);
                        window.location.href = notif.link || '/';
                      }}
                      className={`p-3 rounded-lg hover:bg-slate-900/60 transition-colors cursor-pointer border-b border-slate-800/30 flex flex-col gap-1 ${
                        !notif.isRead ? 'bg-primary-950/5' : ''
                      }`}
                    >
                      <span className="text-xs text-slate-200 leading-normal">{notif.message}</span>
                      <span className="text-[9px] text-slate-500">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="h-6 w-px bg-slate-800" />
            <Link
              to="/profile"
              title="My Profile & Security"
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center border border-primary-500/30 text-sm font-black text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-300 hidden sm:block group-hover:text-white transition-colors">{user?.name}</span>
            </Link>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sops" element={<SOPBrowser />} />
            <Route path="/sops/new" element={<ProtectedRoute requiredPermission="CREATE_SOP"><SOPCreate /></ProtectedRoute>} />
            <Route path="/sops/:id" element={<SOPView />} />
            <Route path="/sops/:id/edit" element={<ProtectedRoute requiredPermission="CREATE_SOP"><SOPCreate /></ProtectedRoute>} />
            <Route path="/admin/pending" element={<ProtectedRoute requiredPermission="APPROVE_SOP"><PendingReviews /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredPermission="CREATE_USER"><UserManager /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute requiredPermission="VIEW_AUDIT"><AuditLogs /></ProtectedRoute>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/library" element={<MyLibrary />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { initAuth, isInitialized } = useAppStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712]">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin mb-4" />
        <span className="text-sm font-medium text-slate-400 animate-pulse">Establishing Session...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
      </Routes>
      <Toast />
    </BrowserRouter>
  );
};
