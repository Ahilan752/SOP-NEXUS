import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import { Key, Mail, ArrowRight, Activity } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isAuthenticated } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      login(token, user);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary-600/10 blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-blue-600/10 blur-[100px]" />

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        {/* Brand Logo & Presentation */}
        <div className="flex flex-col items-center text-center -mb-2 gap-2.5">
          <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/10 border border-slate-800">
            <img 
              src="/sop_nexus_clean_icon.png" 
              alt="SOP NEXUS Icon" 
              className="w-full h-full object-cover scale-105 select-none pointer-events-none"
            />
          </div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent tracking-tight">
            SOP NEXUS
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider -mt-1.5">
            Enterprise Workflow & Compliance Platform
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-panel rounded-2xl p-8 border border-slate-800/80 shadow-2xl shadow-black/60">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {errorMsg && (
              <div className="bg-rose-950/30 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold py-3 rounded-lg shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
