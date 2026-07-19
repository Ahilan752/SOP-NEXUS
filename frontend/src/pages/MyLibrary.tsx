import React, { useEffect, useState } from 'react';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import { Bookmark, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyLibrary: React.FC = () => {
  const { user, showToast } = useAppStore();
  const [savedSops, setSavedSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedSops = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/sops/saved/all');
      setSavedSops(res.data);
    } catch (err) {
      showToast('Failed to load saved procedures', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromLibrary = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await apiClient.post(`/sops/${id}/save`);
      if (user) {
        user.savedSops = res.data.savedSops;
      }
      showToast('Removed from My Library', 'SUCCESS');
      // Update local state
      setSavedSops(savedSops.filter((s) => s._id !== id));
    } catch (err) {
      showToast('Failed to update library', 'REJECTION');
    }
  };

  useEffect(() => {
    fetchSavedSops();
  }, []);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary-500" />
            My Library
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your saved procedures and quick bookmarks.
          </p>
        </div>
        <button
          onClick={fetchSavedSops}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : savedSops.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl">
          You haven't saved any procedures to your library yet. Open any SOP and click "📚 Unsaved" to save it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {savedSops.map((sop) => (
            <div
              key={sop._id}
              className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-primary-500/20 transition-all duration-300 flex flex-col gap-4 group relative"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">
                    {sop.department?.name || 'Cross-dept'}
                  </span>
                  <span className={`text-[9px] border px-2 py-0.5 rounded font-bold ${getPriorityBadge(sop.priority)}`}>
                    {sop.priority}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-primary-400 transition-colors">
                  {sop.title}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                  Category: {sop.category} • Author: {sop.createdBy?.name || 'System'}
                </p>
              </div>

              {sop.tags && sop.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sop.tags.map((tag: string) => (
                    <span key={tag} className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-900 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="h-px bg-slate-900 my-1" />

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/sops/${sop._id}`}
                    className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-slate-850 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Read
                  </Link>
                  <button
                    onClick={(e) => handleRemoveFromLibrary(sop._id, e)}
                    className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-950 hover:bg-rose-900/10 text-rose-400 text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <Link
                  to={`/sops/${sop._id}`}
                  className="text-slate-500 group-hover:text-primary-400 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
