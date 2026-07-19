import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import { RichTextEditor } from '../components/RichTextEditor';
import { Save, Send, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

export const SOPCreate: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // If editing draft
  const navigate = useNavigate();
  const { showToast } = useAppStore();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<string | null>(null);
  const [savedSopId, setSavedSopId] = useState<string | null>(id || null);

  // Load existing draft if editing
  useEffect(() => {
    if (id) {
      const loadDraft = async () => {
        try {
          const res = await apiClient.get(`/sops/${id}`);
          const { sop, version } = res.data;
          
          setTitle(sop.title);
          setCategory(sop.category);
          setPriority(sop.priority);
          setTagsInput(sop.tags ? sop.tags.join(', ') : '');
          setContent(version.content);
          setChangelog(version.changelog || '');
        } catch (err) {
          console.error(err);
          showToast('Failed to load draft data', 'REJECTION');
        }
      };
      loadDraft();
    }
  }, [id, showToast]);

  // Auto-Save Loop: every 30 seconds if we have a savedSopId
  useEffect(() => {
    if (!savedSopId) return;

    const interval = setInterval(async () => {
      try {
        const tags = tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        await apiClient.put(`/sops/${savedSopId}/draft`, {
          title,
          category,
          priority,
          tags,
          content,
          changelog: changelog || 'Auto-saved draft update'
        });
        
        setAutoSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.warn('Draft auto-save failed in background:', err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [savedSopId, title, category, priority, tagsInput, content, changelog]);

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title || !category) {
      showToast('Title and Category are required', 'WARNING');
      return;
    }

    setLoading(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (savedSopId) {
        // Edit existing draft
        await apiClient.put(`/sops/${savedSopId}/draft`, {
          title,
          category,
          priority,
          tags,
          content,
          changelog
        });
        showToast('Draft version updated successfully', 'SUCCESS');
      } else {
        // Create new SOP
        const res = await apiClient.post('/sops', {
          title,
          category,
          priority,
          tags,
          content,
          changelog
        });
        const { sop } = res.data;
        setSavedSopId(sop._id);
        showToast('Initial draft saved successfully', 'SUCCESS');
      }
      setAutoSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error(err);
      showToast('Failed to save draft', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    // 1. Save current changes first
    await handleSaveDraft();

    if (!savedSopId) {
      showToast('SOP must be saved before submitting', 'WARNING');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post(`/sops/${savedSopId}/submit`);
      showToast('SOP submitted for approval!', 'SUCCESS');
      navigate('/sops');
    } catch (err) {
      console.error(err);
      showToast('Submission for approval failed', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/sops')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-white">
              {id ? 'Edit Draft SOP' : 'Create Standard Operating Procedure'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Author rich text content procedures and send for verification review.
            </p>
          </div>
        </div>

        {/* Saved Status Indicator */}
        {autoSavedAt && (
          <div className="flex items-center gap-2 bg-emerald-950/20 text-emerald-400 border border-emerald-500/10 px-3 py-1.5 rounded-lg text-[10px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Auto-saved draft at {autoSavedAt}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">SOP Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Deploy Kubernetes Application"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Content (Rich Text Procedure Guide)</label>
              <RichTextEditor content={content} onChange={setContent} />
            </div>
          </div>
        </div>

        {/* Metadata Sidebar Panel */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-5">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">
              SOP Configurations
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Infrastructure, Policies, Onboarding"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Priority Severity</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
              >
                <option value="Low" className="bg-slate-950">Low Priority</option>
                <option value="Medium" className="bg-slate-950">Medium Priority</option>
                <option value="High" className="bg-slate-950">High Priority</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Search Keywords / Tags</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., docker, aws, k8s (comma separated)"
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Version Changelog Log</label>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="What changes were introduced in this draft?"
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
            </div>

            <div className="h-px bg-slate-900" />

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSaveDraft()}
                className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-slate-400" />
                Save Draft
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleSubmitForApproval}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-550 hover:to-primary-450 text-white text-xs font-bold py-3 rounded-lg shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
