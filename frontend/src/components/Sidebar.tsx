import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../context/store';
import { 
  LayoutDashboard, 
  FileText, 
  FilePlus2, 
  ClipboardCheck, 
  Users, 
  History, 
  LogOut,
  Shield,
  Layers,
  Bookmark
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAppStore();

  if (!user) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-primary-600/20 text-primary-400 border-l-4 border-primary-500 font-semibold'
        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
    }`;

  const hasAdminOps = user.permissions.includes('APPROVE_SOP') || 
                      user.permissions.includes('CREATE_USER') || 
                      user.permissions.includes('VIEW_AUDIT');

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-col h-screen sticky top-0">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
          <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            SOP NEXUS
          </h1>
      </div>

      {/* User Card */}
      <div className="p-4 mx-4 my-4 rounded-xl bg-slate-900/60 border border-slate-800/50 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {user.permissions.includes('VIEW_AUDIT') ? (
            <Shield className="w-4 h-4 text-amber-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="text-xs font-bold text-slate-200 truncate max-w-[150px]">
            {user.name}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 truncate">{user.email}</span>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px] bg-primary-600/10 text-primary-400 px-2 py-0.5 rounded-full font-bold border border-primary-500/10 uppercase">
            {user.role}
          </span>
          {user.department && (
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold border border-slate-700/10">
              {user.department.name}
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 flex flex-col gap-1.5 overflow-y-auto">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </NavLink>

        <NavLink to="/sops" end className={linkClass}>
          <FileText className="w-4 h-4" />
          SOP Browser
        </NavLink>

        <NavLink to="/library" className={linkClass}>
          <Bookmark className="w-4 h-4" />
          My Library
        </NavLink>

        {user.permissions.includes('CREATE_SOP') && (
          <NavLink to="/sops/new" className={linkClass}>
            <FilePlus2 className="w-4 h-4" />
            Create SOP
          </NavLink>
        )}

        {hasAdminOps && (
          <>
            <div className="h-px bg-slate-800/50 my-2" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-1">
              Admin Ops
            </span>
            {user.permissions.includes('APPROVE_SOP') && (
              <NavLink to="/admin/pending" className={linkClass}>
                <ClipboardCheck className="w-4 h-4" />
                Pending Review
              </NavLink>
            )}
            {user.permissions.includes('CREATE_USER') && (
              <NavLink to="/admin/users" className={linkClass}>
                <Users className="w-4 h-4" />
                User Manager
              </NavLink>
            )}
            {user.permissions.includes('VIEW_AUDIT') && (
              <NavLink to="/admin/audit" className={linkClass}>
                <History className="w-4 h-4" />
                System Audit Logs
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};
