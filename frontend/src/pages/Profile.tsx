import React, { useState } from 'react';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import { User, Shield, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, showToast } = useAppStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'REJECTION');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'WARNING');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/auth/change-password', { currentPassword, newPassword });
      showToast('Password changed successfully!', 'SUCCESS');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to change password.', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    if (newPassword.length === 0) return null;
    if (newPassword.length < 6)  return { label: 'Too short', color: 'bg-rose-500', width: 'w-1/4' };
    if (newPassword.length < 8)  return { label: 'Weak',      color: 'bg-orange-400', width: 'w-2/4' };
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
                                  return { label: 'Fair',      color: 'bg-yellow-400', width: 'w-3/4' };
    return                               { label: 'Strong',    color: 'bg-emerald-400', width: 'w-full' };
  })();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-primary-400" />
          My Profile
        </h2>
        <p className="text-xs text-slate-500 mt-1">View your account details and manage your security settings.</p>
      </div>

      {/* Account Info Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <User className="w-3.5 h-3.5" /> Account Information
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-primary-500/20">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-0.5">
            <div className="text-base font-bold text-white">{user?.name}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20 px-2 py-0.5 rounded">
                {user?.role}
              </span>
              {user?.department && (
                <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded">
                  {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Permissions</div>
            <div className="flex flex-wrap gap-1">
              {user?.permissions?.map((p) => (
                <span key={p} className="text-[8px] bg-slate-900 text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-400" /> Change Password
        </h3>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-300">Password changed successfully. Use your new password on next login.</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {/* Strength meter */}
            {strength && (
              <div className="mt-1.5 space-y-1">
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                </div>
                <span className={`text-[10px] font-semibold ${
                  strength.label === 'Strong' ? 'text-emerald-400' :
                  strength.label === 'Fair'   ? 'text-yellow-400' :
                  strength.label === 'Weak'   ? 'text-orange-400' : 'text-rose-400'
                }`}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className={`w-full bg-slate-900 border rounded-lg px-3 py-2.5 pr-10 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-rose-500 focus:border-rose-400'
                    : 'border-slate-800 focus:border-primary-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <span className="text-[10px] text-rose-400 font-semibold">Passwords do not match</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                Update Password
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
