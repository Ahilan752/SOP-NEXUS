import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAppStore } from '../context/store';
import { ClipboardCheck, FileText, Check, X, AlertCircle } from 'lucide-react';

export const PendingReviews: React.FC = () => {
  const { showToast } = useAppStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPending = async () => {
    setLoading(true);
    try {
      // Fetch all SOPs
      const res = await apiClient.get('/sops');
      // Filter for sops that have an editableVersion in status 'Pending Approval'
      const pending = res.data.filter((s: any) => s.editableVersion?.status === 'Pending Approval');
      setItems(pending);
      setSelectedItem(null);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      console.error(err);
      showToast('Failed to load pending reviews', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleInspect = async (sopId: string) => {
    try {
      // Get the full detail including the pending version content
      const res = await apiClient.get(`/sops/${sopId}`);
      setSelectedItem(res.data);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      showToast('Failed to load SOP details for inspection', 'REJECTION');
    }
  };

  const handleReview = async (action: 'Approve' | 'Reject') => {
    if (action === 'Reject' && !rejectReason.trim()) {
      showToast('Please enter a rejection reason', 'WARNING');
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.post(`/sops/${selectedItem.sop._id}/review`, {
        action,
        reason: action === 'Approve' ? 'Approved by Admin' : rejectReason
      });

      showToast(
        action === 'Approve'
          ? 'SOP approved and published!'
          : 'SOP rejected and sent back to manager',
        'SUCCESS'
      );
      loadPending();
    } catch (err) {
      showToast('Failed to review SOP', 'REJECTION');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-500" />
          Pending Reviews
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review standard operating procedures submitted by department managers.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center text-xs text-emerald-400 bg-emerald-950/10 border border-dashed border-emerald-900/30 rounded-2xl flex flex-col items-center gap-2">
          <Check className="w-8 h-8 text-emerald-500" />
          <span>All caught up! No SOPs require approval review.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">
              Queue ({items.length})
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {items.map((sop) => (
                <button
                  key={sop._id}
                  onClick={() => handleInspect(sop._id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    selectedItem?.sop._id === sop._id
                      ? 'border-primary-500 bg-primary-950/25'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{sop.title}</span>
                    <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/10 px-2 py-0.5 rounded font-bold uppercase">
                      v{sop.editableVersion.versionNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold">
                    <span className="uppercase">{sop.department?.name}</span>
                    <span>•</span>
                    <span>{sop.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Inspection content */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-6">
                {/* SOP Info */}
                <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedItem.sop.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Submitted for version: v{selectedItem.version.versionNumber} • Category: {selectedItem.sop.category}
                    </p>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-bold uppercase border border-slate-700">
                    {selectedItem.sop.department?.name}
                  </span>
                </div>

                {/* Changelog */}
                {selectedItem.version.changelog && (
                  <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Manager Changelog</span>
                    <p className="text-xs text-slate-300 font-medium italic mt-1">"{selectedItem.version.changelog}"</p>
                  </div>
                )}

                {/* Rich Content Render */}
                <div className="bg-slate-900/10 border border-slate-850 p-6 rounded-xl min-h-[250px] overflow-y-auto max-h-[350px]">
                  <div 
                    className="ProseMirror text-slate-200 text-xs"
                    dangerouslySetInnerHTML={{ __html: selectedItem.version.content }} 
                  />
                </div>

                {/* Attachments if any */}
                {selectedItem.version.attachments?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.version.attachments.map((file: any, idx: number) => (
                        <a
                          key={idx}
                          href={`http://localhost:5000/uploads/${file.filename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white px-2.5 py-1.5 rounded"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decision form */}
                <div className="border-t border-slate-900 pt-6 flex flex-col gap-4">
                  {showRejectForm ? (
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase">Rejection Reason Comment</label>
                        <textarea
                          required
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Please provide explicit feedback on what parts of the deployment/policy steps are missing or incorrect..."
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors resize-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowRejectForm(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleReview('Reject')}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(true)}
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 px-4 py-2.5 rounded-lg text-xs font-bold transition-all"
                      >
                        <X className="w-4 h-4" />
                        Reject with Feedback
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleReview('Approve')}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg"
                      >
                        <Check className="w-4 h-4" />
                        Approve & Publish SOP
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 min-h-[300px]">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">Select an SOP from the left queue to inspect and review.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
