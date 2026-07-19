import React, { useEffect, useState } from 'react';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FileText,
  FileCheck,
  FileClock,
  FileWarning,
  Users,
  Building,
  CheckCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileEdit,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAppStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-800 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-800 rounded-xl" />
          <div className="h-80 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return <div className="text-rose-400 text-xs">Failed to load dashboard statistics.</div>;

  // Colors for Recharts Pie
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h2 className="text-xl font-extrabold text-white">
          Welcome back, {user?.name}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Here is your summary of the standard operating procedures.
        </p>
      </div>

      {/* ====================================================
          1. ADMIN DASHBOARD
          ==================================================== */}
      {stats.role === 'Admin' && (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-primary-500/10 text-primary-400 rounded-xl border border-primary-500/10">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Employees</span>
                <h3 className="text-2xl font-black text-white mt-1">{stats.metrics.totalUsers}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/10">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Departments</span>
                <h3 className="text-2xl font-black text-white mt-1">{stats.metrics.departments}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/10">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total SOP Documents</span>
                <h3 className="text-2xl font-black text-white mt-1">{stats.metrics.totalSops}</h3>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/10">
                <FileClock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Approvals</span>
                <h3 className="text-2xl font-black text-amber-400 mt-1">{stats.metrics.pendingApproval}</h3>
              </div>
            </div>
          </div>

          {/* Sub Metrics Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Published</div>
              <div className="text-base font-extrabold text-slate-200 mt-1">{stats.metrics.published}</div>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Drafts</div>
              <div className="text-base font-extrabold text-slate-200 mt-1">{stats.metrics.draft}</div>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Rejected</div>
              <div className="text-base font-extrabold text-slate-200 mt-1">{stats.metrics.rejected}</div>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Pending Review</div>
              <div className="text-base font-extrabold text-amber-500 mt-1">{stats.metrics.pendingApproval}</div>
            </div>
          </div>

          {/* Recharts Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary-400" />
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">SOPs Per Department</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.charts.sopsPerDepartment}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sops"
                    >
                      {stats.charts.sopsPerDepartment.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">Monthly SOP Created & Published</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.charts.monthlyTrend}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="created" name="Created" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="published" name="Published" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====================================================
          2. MANAGER DASHBOARD
          ==================================================== */}
      {stats.role === 'Manager' && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-panel p-4 rounded-xl text-center border border-slate-800">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Department SOPs</div>
              <div className="text-xl font-black text-white mt-1">{stats.metrics.totalSops}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border border-slate-800">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Published</div>
              <div className="text-xl font-black text-emerald-400 mt-1">{stats.metrics.published}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border border-slate-800">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Pending Approval</div>
              <div className="text-xl font-black text-amber-500 mt-1">{stats.metrics.pending}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border border-slate-800">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Drafts</div>
              <div className="text-xl font-black text-slate-400 mt-1">{stats.metrics.drafts}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl text-center border border-slate-800">
              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Rejected</div>
              <div className="text-xl font-black text-rose-500 mt-1">{stats.metrics.rejected}</div>
            </div>
          </div>

          {/* SOP Acknowledgment Performance Reports */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest">
                  Department Acknowledgment Reports
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Track employee reading progress of your published SOPs.
                </p>
              </div>
            </div>

            {stats.reports.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                No published SOPs available in your department to report.
              </div>
            ) : (
              <div className="space-y-4">
                {stats.reports.map((report: any, idx: number) => {
                  const total = report.read + report.unread;
                  const rate = total > 0 ? Math.round((report.read / total) * 100) : 0;
                  return (
                    <div key={idx} className="bg-slate-950/30 border border-slate-900 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-200 truncate">{report.title}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">v{report.version}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-semibold">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Read: {report.read}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> Unread: {report.unread}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full md:w-64 flex items-center gap-3">
                        <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-full rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-extrabold text-slate-300 min-w-[36px] text-right">{rate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ====================================================
          3. EMPLOYEE DASHBOARD
          ==================================================== */}
      {stats.role === 'Employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 text-center">
                <FileWarning className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Unread SOPs</span>
                <h4 className="text-xl font-black text-amber-400 mt-1">{stats.metrics.unreadSops}</h4>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 text-center">
                <FileClock className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Recent Updates</span>
                <h4 className="text-xl font-black text-blue-400 mt-1">{stats.metrics.recentlyUpdated}</h4>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 text-center">
                <FileCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Acknowledged</span>
                <h4 className="text-xl font-black text-emerald-400 mt-1">{stats.metrics.acknowledged}</h4>
              </div>
            </div>

            {/* Unread checklist */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800/80">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest mb-4">
                Required Reading Action Checklist
              </h3>
              
              {stats.unreadList.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-400 bg-emerald-950/10 border border-dashed border-emerald-900/30 rounded-xl flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <span>You are fully compliant! All department SOPs are read and acknowledged.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.unreadList.map((sop: any, idx: number) => (
                    <Link 
                      key={idx}
                      to={`/sops/${sop.sopId}`}
                      className="flex items-center justify-between p-3.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/60 rounded-xl transition-all duration-200"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-200">{sop.title}</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/10 font-bold">
                            Pending Read
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold">
                          <span>{sop.category}</span>
                          <span>•</span>
                          <span>v{sop.versionNumber}</span>
                          <span>•</span>
                          <span>Published {new Date(sop.publishedAt).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 hover:text-slate-300 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Activity Feed */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" />
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">
                Activity Feed
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {stats.activityFeed.length === 0 ? (
                <div className="text-xs text-slate-500 p-4 text-center">No recent activities.</div>
              ) : (
                stats.activityFeed.map((event: any, idx: number) => (
                  <div key={idx} className="relative pl-5 border-l-2 border-slate-800 pb-2">
                    {/* Circle bullet */}
                    <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-primary-500" />
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {event.message}
                    </p>
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      {new Date(event.createdAt).toLocaleDateString('en-GB')} at{' '}
                      {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
