import React, { useEffect, useState } from 'react';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import { Search, Filter, FolderPlus, ArrowRight, Eye, Edit3, ClipboardCopy, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SOPBrowser: React.FC = () => {
  const { sops, fetchSops, user, showToast, departments, fetchDepartments } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  useEffect(() => {
    fetchSops();
    fetchDepartments();
  }, [fetchSops, fetchDepartments]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSops(searchTerm);
  };

  const handleDeleteSOP = async (sopId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?\n\nThis action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/sops/${sopId}`);
      showToast(`"${title}" deleted successfully`, 'SUCCESS');
      fetchSops(searchTerm);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete SOP', 'REJECTION');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchSops('');
  };

  // Filter local results further by department & priority if needed
  const filteredSops = sops.filter((sop) => {
    const matchesDept = selectedDept
      ? sop.department?._id === selectedDept
      : true;
    const matchesPriority = selectedPriority
      ? sop.priority === selectedPriority
      : true;
    return matchesDept && matchesPriority;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">SOP Browser</h2>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter and read standard operating procedures.
          </p>
        </div>
        {user?.permissions.includes('CREATE_SOP') && (
          <Link
            to="/sops/new"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-primary-600/20 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create SOP
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, tags, category or content..."
            className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-10 pr-24 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 font-medium"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="bg-primary-600/20 text-primary-400 border border-primary-500/20 px-3.5 py-1 rounded-md text-[10px] font-bold hover:bg-primary-600 hover:text-white transition-all"
            >
              Search
            </button>
          </div>
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department Filter (Admin only, since Managers/Employees are locked to their own) */}
          {user?.permissions.includes('VIEW_ALL_SOPS') && (
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-950 text-slate-400">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id} className="bg-slate-950 text-slate-100">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-950 text-slate-400">All Priorities</option>
              <option value="High" className="bg-slate-950 text-rose-400">High</option>
              <option value="Medium" className="bg-slate-950 text-amber-400">Medium</option>
              <option value="Low" className="bg-slate-950 text-emerald-400">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* SOP Grid List */}
      {filteredSops.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl">
          No standard operating procedures found matching the search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSops.map((sop) => (
            <div
              key={sop._id}
              className="glass-panel p-6 rounded-2xl border border-slate-800/80 hover:border-primary-500/20 transition-all duration-300 flex flex-col gap-4 group relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {sop.department && (
                      <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase border border-slate-700/30">
                        {sop.department.name}
                      </span>
                    )}
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase border border-slate-700/30">
                      {sop.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-primary-400 transition-colors truncate">
                    {sop.title}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${getPriorityBadge(sop.priority)}`}>
                  {sop.priority}
                </span>
              </div>

              {/* Tags */}
              {sop.tags && sop.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {sop.tags.map((t, idx) => (
                    <span key={idx} className="text-[9px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40 font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Status Section */}
              <div className="mt-auto border-t border-slate-900 pt-4 flex items-center justify-between gap-4 text-[10px] font-semibold text-slate-400">
                <div className="flex flex-col gap-1">
                  {sop.publishedVersion ? (
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Published: v{sop.publishedVersion.versionNumber}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      No Published Version
                    </span>
                  )}

                  {sop.editableVersion && (
                    <span className="flex items-center gap-1 text-amber-500/90">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending: v{sop.editableVersion.versionNumber} ({sop.editableVersion.status})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* View Details Link */}
                  <Link
                    to={`/sops/${sop._id}`}
                    className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md border border-slate-800/80 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Read
                  </Link>

                  {/* Edit Draft (Manager only) */}
                  {user?.permissions.includes('EDIT_SOP') && sop.editableVersion && (
                    <Link
                      to={`/sops/${sop._id}/edit`}
                      className="flex items-center gap-1 bg-primary-950/20 hover:bg-primary-950/40 text-primary-400 hover:text-primary-300 px-2.5 py-1.5 rounded-md border border-primary-500/10 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Draft
                    </Link>
                  )}

                  {/* Delete SOP (Admin / DELETE_SOP permission only) */}
                  {user?.permissions.includes('DELETE_SOP') && (
                    <button
                      onClick={() => handleDeleteSOP(sop._id, sop.title)}
                      className="flex items-center gap-1 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-md border border-rose-500/10 transition-colors"
                      title="Delete SOP"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
