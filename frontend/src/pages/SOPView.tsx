import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/store';
import { apiClient } from '../services/api';
import {
  FileText,
  History,
  MessageSquare,
  Paperclip,
  CheckCircle,
  HelpCircle,
  Brain,
  Upload,
  Send,
  UserCheck,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  Download,
  Bookmark,
  Trash2
} from 'lucide-react';

export const SOPView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, showToast } = useAppStore();

  const [sop, setSop] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [selectedVersionNum, setSelectedVersionNum] = useState('');
  
  // Comments and attachments
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Acknowledgment Report (Manager/Admin only)
  const [report, setReport] = useState<any>(null);
  const [showUnreadList, setShowUnreadList] = useState(false);
  const [readingHistory, setReadingHistory] = useState<any>(null);

  // New version dialog
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [bumpType, setBumpType] = useState<'minor' | 'major'>('minor');
  const [versionChangelog, setVersionChangelog] = useState('');

  // AI Assistant Drawer
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiTab, setAiTab] = useState<'summary' | 'qna' | 'quiz'>('summary');
  
  const [aiSummary, setAiSummary] = useState('');
  const [aiBullets, setAiBullets] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');

  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // Load SOP data
  const loadSOPData = async (vNum?: string) => {
    try {
      const url = vNum ? `/sops/${id}?versionNumber=${vNum}` : `/sops/${id}`;
      const res = await apiClient.get(url);
      const { sop: sData, version: vData, versionsList: vList, hasAcknowledged: ack, readingHistory: rh } = res.data;
      
      setSop(sData);
      setVersion(vData);
      setVersionsList(vList);
      setHasAcknowledged(ack);
      setReadingHistory(rh || null);
      setSelectedVersionNum(vData.versionNumber);

      // Load acknowledgment report if user has VIEW_REPORTS permission and version is Published
      if (user && user.permissions.includes('VIEW_REPORTS') && vData.status === 'Published') {
        const repRes = await apiClient.get(`/sops/${id}/versions/${vData._id}/report`);
        setReport(repRes.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load SOP details', 'REJECTION');
    }
  };

  useEffect(() => {
    loadSOPData();
  }, [id]);

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    loadSOPData(e.target.value);
    // Reset AI drawer states
    setAiSummary('');
    setAiBullets([]);
    setAiAnswer('');
    setQuizQuestions([]);
    setQuizSubmitted(false);
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await apiClient.post(`/sops/versions/${version._id}/comments`, { text: commentText });
      setVersion({
        ...version,
        comments: [...version.comments, res.data.comment]
      });
      setCommentText('');
      showToast('Comment posted', 'SUCCESS');
    } catch (err) {
      showToast('Failed to add comment', 'REJECTION');
    }
  };

  // Upload Attachment
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/sops/versions/${version._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setVersion({
        ...version,
        attachments: [...version.attachments, res.data.attachment]
      });
      showToast('Attachment uploaded successfully', 'SUCCESS');
    } catch (err) {
      showToast('Upload failed. Limit 10MB.', 'REJECTION');
    }
  };

  // Delete Attachment
  const handleDeleteAttachment = async (attachmentId: string, originalName: string) => {
    if (!window.confirm(`Delete "${originalName}"? This cannot be undone.`)) return;
    try {
      const res = await apiClient.delete(`/sops/versions/${version._id}/attachments/${attachmentId}`);
      setVersion({
        ...version,
        attachments: res.data.attachments
      });
      showToast(`"${originalName}" removed successfully`, 'SUCCESS');
    } catch (err) {
      showToast('Failed to delete attachment', 'REJECTION');
    }
  };

  // Acknowledge SOP
  const handleAcknowledge = async () => {
    // If quiz is not completed and passed, require it first
    if (quizQuestions.length > 0 && !quizPassed) {
      showToast('Please pass the AI comprehension quiz before acknowledging.', 'WARNING');
      return;
    }

    // Calculate quiz score to send
    let score = 100;
    if (quizQuestions.length > 0) {
      let correctCount = 0;
      quizQuestions.forEach((q: any, idx: number) => {
        if (quizAnswers[idx] === q.answerIndex) correctCount++;
      });
      score = Math.round((correctCount / quizQuestions.length) * 100);
    }

    try {
      await apiClient.post(`/sops/${sop._id}/versions/${version._id}/acknowledge`, { quizScore: score });
      setHasAcknowledged(true);
      showToast('Procedure acknowledged successfully', 'SUCCESS');
      loadSOPData(version.versionNumber); // reload report
    } catch (err) {
      showToast('Acknowledgment failed', 'REJECTION');
    }
  };

  const handleToggleSaveSOP = async () => {
    if (!sop) return;
    try {
      const res = await apiClient.post(`/sops/${sop._id}/save`);
      if (user) {
        user.savedSops = res.data.savedSops;
      }
      showToast(res.data.message, 'SUCCESS');
      // trigger small rerender by updating sop state references or state
      setSop({ ...sop });
    } catch (err) {
      showToast('Failed to update library', 'REJECTION');
    }
  };

  // Download SOP
  const handleDownloadSOP = () => {
    if (!sop || !version) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${sop.title} - v${version.versionNumber}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
          }
          .header {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 10px 0;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
          }
          .badge {
            display: inline-block;
            padding: 3.5px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 8px;
          }
          .badge-dept {
            background-color: #f1f5f9;
            color: #475569;
          }
          .badge-priority {
            background-color: #fef3c7;
            color: #d97706;
          }
          .badge-version {
            background-color: #dcfce7;
            color: #15803d;
          }
          .content {
            font-size: 15px;
            color: #334155;
          }
          .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .content th, .content td {
            border: 1px solid #e2e8f0;
            padding: 10px;
            text-align: left;
          }
          .content th {
            background-color: #f8fafc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="margin-bottom: 12px;">
            <span class="badge badge-dept">${sop.department?.name || 'General'}</span>
            <span class="badge badge-priority">${sop.priority} Priority</span>
            <span class="badge badge-version">Version ${version.versionNumber}</span>
          </div>
          <h1 class="title">${sop.title}</h1>
          <div class="meta">
            Category: ${sop.category || 'General'} • Author: ${sop.createdBy?.name || 'System'} • Date: ${new Date(sop.createdAt).toLocaleDateString('en-GB')}
          </div>
        </div>
        <div class="content">
          ${version.content || '<p style="color: #64748b; font-style: italic;">No content written yet.</p>'}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${sop.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_v${version.versionNumber}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('SOP document downloaded!', 'SUCCESS');
  };

  // Create New Version
  const handleCreateNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/sops/${sop._id}/version`, {
        bumpType,
        changelog: versionChangelog
      });
      showToast('New draft version created!', 'SUCCESS');
      setShowVersionModal(false);
      navigate(`/sops/${sop._id}/edit`);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create new version', 'REJECTION');
    }
  };

  // AI Actions
  const handleAiSummarize = async () => {
    setAiLoading(true);
    setAiTab('summary');
    try {
      const res = await apiClient.get(`/sops/versions/${version._id}/ai/summary`);
      setAiSummary(res.data.summary);
      setAiBullets(res.data.bullets);
    } catch (err) {
      showToast('AI Summarization failed', 'REJECTION');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiQnA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setAiLoading(true);
    setAiTab('qna');
    try {
      const res = await apiClient.post(`/sops/versions/${version._id}/ai/qna`, { question: aiQuestion });
      setAiAnswer(res.data.answer);
    } catch (err) {
      showToast('AI Response failed', 'REJECTION');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiQuiz = async () => {
    setAiLoading(true);
    setAiTab('quiz');
    try {
      const res = await apiClient.get(`/sops/versions/${version._id}/ai/quiz`);
      setQuizQuestions(res.data.quiz);
      setQuizAnswers(new Array(res.data.quiz.length).fill(-1));
      setQuizSubmitted(false);
      setQuizPassed(false);
    } catch (err) {
      showToast('Quiz generation failed', 'REJECTION');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectQuizAnswer = (qIdx: number, oIdx: number) => {
    const updated = [...quizAnswers];
    updated[qIdx] = oIdx;
    setQuizAnswers(updated);
  };

  const handleQuizSubmit = () => {
    // Check if all answered
    if (quizAnswers.includes(-1)) {
      showToast('Please answer all questions before submitting.', 'WARNING');
      return;
    }

    // Verify answers
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.answerIndex) {
        correctCount++;
      }
    });

    setQuizSubmitted(true);
    if (correctCount === quizQuestions.length) {
      setQuizPassed(true);
      showToast('Congratulations! You passed the comprehension quiz.', 'SUCCESS');
    } else {
      setQuizPassed(false);
      showToast(`Quiz failed. Score: ${correctCount}/${quizQuestions.length}. Try again.`, 'REJECTION');
    }
  };

  if (!sop || !version) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
      </div>
    );
  }

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'High':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Published':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Pending Approval':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold border border-slate-700">
              {sop.department?.name}
            </span>
            <span className={`text-[9px] border px-2 py-0.5 rounded font-bold ${getPriorityBadge(sop.priority)}`}>
              {sop.priority} Priority
            </span>
            <span className={`text-[9px] border px-2 py-0.5 rounded font-bold ${getStatusBadge(version.status)}`}>
              {version.status}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">{sop.title}</h2>
          <p className="text-[10px] text-slate-500 mt-1">
            Author: {sop.createdBy?.name} • Created on {new Date(sop.createdAt).toLocaleDateString('en-GB')}
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Version Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
            <History className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedVersionNum}
              onChange={handleVersionChange}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer font-semibold"
            >
              {versionsList.map((v) => (
                <option key={v.versionNumber} value={v.versionNumber} className="bg-slate-950 text-slate-100">
                  v{v.versionNumber} ({v.status})
                </option>
              ))}
            </select>
          </div>

          {/* Save to My Library Button */}
          {user && (
            <button
              onClick={handleToggleSaveSOP}
              className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg border transition-all ${
                user.savedSops?.includes(sop._id)
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/20'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {user.savedSops?.includes(sop._id) ? (
                <>
                  <span>✅ Saved</span>
                </>
              ) : (
                <>
                  <span>📚 Unsaved</span>
                </>
              )}
            </button>
          )}

          {/* AI Helper Toggle */}
          <button
            onClick={() => {
              setAiDrawerOpen(!aiDrawerOpen);
              if (!aiDrawerOpen && aiSummary === '') {
                handleAiSummarize();
              }
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-550 hover:to-primary-450 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-lg shadow-primary-500/10 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            Ask AI Assistant
          </button>

          {/* Download SOP button */}
          <button
            onClick={handleDownloadSOP}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download SOP
          </button>

          {/* Create New Version button (when no other editable version exists) */}
          {user?.permissions.includes('CREATE_SOP') && !versionsList.some(v => ['Draft', 'Pending Approval', 'Rejected'].includes(v.status)) && (
            <button
              onClick={() => setShowVersionModal(true)}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
            >
              New Version
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Version Changelog Alert */}
          {version.changelog && (
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex items-start gap-3">
              <BookOpen className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Version Changelog</h4>
                <p className="text-xs text-slate-300 mt-1 font-medium italic">"{version.changelog}"</p>
              </div>
            </div>
          )}

          {/* Document Content Render */}
          <div className="glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-lg min-h-[400px]">
            <div 
              className="ProseMirror text-slate-200 max-w-none leading-relaxed text-sm"
              dangerouslySetInnerHTML={{ __html: version.content || '<p class="text-slate-500 italic">No content written yet.</p>' }} 
            />
          </div>

          {/* Acknowledgment report (Manager/Admin Only) */}
          {report && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Acknowledgment Progress (v{report.versionNumber})
                  </h3>
                </div>
                <button
                  onClick={() => setShowUnreadList(!showUnreadList)}
                  className="text-[10px] text-primary-400 hover:underline font-semibold"
                >
                  {showUnreadList ? 'Hide Unread List' : `View ${report.unreadCount} Unread Employees`}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Target Employees</div>
                  <div className="text-lg font-black text-slate-200 mt-0.5">{report.readCount + report.unreadCount}</div>
                </div>
                <div className="bg-emerald-950/15 p-3 rounded-lg border border-emerald-900/20">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Acknowledged</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{report.readCount}</div>
                </div>
                <div className="bg-rose-950/15 p-3 rounded-lg border border-rose-900/20">
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Unread</div>
                  <div className="text-lg font-black text-rose-400 mt-0.5">{report.unreadCount}</div>
                </div>
              </div>

              {showUnreadList && report.unreadList.length > 0 && (
                <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase mb-2">Unread List</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {report.unreadList.map((emp: any) => (
                      <div key={emp._id} className="text-xs bg-slate-900/50 p-2.5 rounded border border-slate-800 flex flex-col">
                        <span className="font-bold text-slate-300">{emp.name}</span>
                        <span className="text-[9px] text-slate-500">{emp.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Employee Acknowledgment check box (Only for published versions) */}
          {user?.permissions.includes('ACKNOWLEDGE_SOP') && version.status === 'Published' && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              {hasAcknowledged ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold">Standard Operating Procedure Acknowledged</h4>
                    <p className="text-[10px] text-emerald-500/80 mt-0.5">
                      You have verified that you have read, understood, and agreed to adhere to this procedure version.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Acknowledgment Compliance Required</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Please review the document details. You must acknowledge that you understand this policy version.
                      </p>
                    </div>
                  </div>

                  {quizQuestions.length > 0 && !quizPassed && (
                    <div className="bg-amber-950/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold p-3 rounded-lg">
                      Comprehension Check: You must load and complete the AI Assistant Quiz first.
                    </div>
                  )}

                  <button
                    onClick={handleAcknowledge}
                    disabled={quizQuestions.length > 0 && !quizPassed}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 px-6 rounded-lg shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 self-start transition-colors disabled:opacity-40"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Acknowledge: I Have Read & Understood
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reading History (Employee view) */}
          {user?.permissions.includes('ACKNOWLEDGE_SOP') && version.status === 'Published' && readingHistory && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                Reading History
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Opened</div>
                  <div className="text-xs font-bold text-blue-400">
                    {readingHistory.openedAt
                      ? new Date(readingHistory.openedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Acknowledged</div>
                  <div className="text-xs font-bold text-emerald-400">
                    {readingHistory.acknowledgedAt
                      ? new Date(readingHistory.acknowledgedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-center">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Quiz Score</div>
                  <div className={`text-xs font-bold ${readingHistory.acknowledgedAt ? (readingHistory.quizScore >= 80 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-600'}`}>
                    {readingHistory.acknowledgedAt ? `${readingHistory.quizScore || 0}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collaborations, Comments & Attachments Sidebar */}
        <div className="space-y-6">
          {/* File Attachments */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-500" />
                Attachments ({version.attachments?.length || 0})
              </h3>
              {user?.permissions.includes('EDIT_SOP') && version.status === 'Draft' && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadAttachment}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-primary-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                </>
              )}
            </div>

            {version.attachments?.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic py-2">No attachments uploaded</span>
            ) : (
              <div className="space-y-2">
                {version.attachments?.map((file: any, idx: number) => (
                  <div
                    key={file._id || idx}
                    className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-850 rounded-lg hover:border-slate-700/60 transition-colors group"
                  >
                    <a
                      href={`http://localhost:5000/uploads/${file.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 pr-2"
                    >
                      <div className="text-[11px] font-bold text-slate-300 truncate">{file.originalName}</div>
                      <div className="text-[9px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </a>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`http://localhost:5000/uploads/${file.filename}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
                      </a>
                      {user?.permissions.includes('EDIT_SOP') && version.status === 'Draft' && (
                        <button
                          onClick={() => handleDeleteAttachment(file._id, file.originalName)}
                          title={`Delete ${file.originalName}`}
                          className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest flex items-center gap-2 border-b border-slate-900 pb-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Collaboration thread ({version.comments?.length || 0})
            </h3>

            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {version.comments?.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic block py-2">No discussion started</span>
              ) : (
                version.comments?.map((c: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/30 border border-slate-850 p-2.5 rounded-lg text-[11px]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-slate-200">{c.userName}</span>
                      <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        {c.role}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-normal">{c.text}</p>
                    <span className="text-[8px] text-slate-600 mt-1 block">
                      {new Date(c.timestamp).toLocaleDateString('en-GB')} at{' '}
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
              <input
                type="text"
                required
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Post a comment/reply..."
                className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
              />
              <button
                type="submit"
                className="p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ====================================================
          AI ASSISTANT DRAWER PANEL
          ==================================================== */}
      {aiDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-950 border-l border-slate-850 shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-900 flex items-center justify-between bg-slate-900/10">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest">AI Engine Assistant</h3>
                <p className="text-[9px] text-slate-500 font-semibold uppercase">v{version.versionNumber} context</p>
              </div>
            </div>
            <button
              onClick={() => setAiDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-100 p-1.5 hover:bg-slate-900 rounded"
            >
              Close
            </button>
          </div>

          {/* Navigation tabs */}
          <div className="grid grid-cols-3 text-center border-b border-slate-900 text-[10px] font-bold">
            <button
              onClick={handleAiSummarize}
              className={`py-3 border-b-2 ${aiTab === 'summary' ? 'border-primary-500 text-primary-400 bg-primary-950/5' : 'border-transparent text-slate-400'}`}
            >
              Summary
            </button>
            <button
              onClick={() => setAiTab('qna')}
              className={`py-3 border-b-2 ${aiTab === 'qna' ? 'border-primary-500 text-primary-400 bg-primary-950/5' : 'border-transparent text-slate-400'}`}
            >
              Ask Questions
            </button>
            <button
              onClick={handleAiQuiz}
              className={`py-3 border-b-2 ${aiTab === 'quiz' ? 'border-primary-500 text-primary-400 bg-primary-950/5' : 'border-transparent text-slate-400'}`}
            >
              Quiz Check
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center flex-1 h-full py-20 gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
                <span className="text-[10px] text-slate-500 font-bold animate-pulse">Consulting SOP Context...</span>
              </div>
            ) : (
              <>
                {/* 1. Tab Summary */}
                {aiTab === 'summary' && (
                  <div className="space-y-4">
                    <p className="text-slate-300 font-medium leading-relaxed">{aiSummary || 'Summary not triggered'}</p>
                    {aiBullets.length > 0 && (
                      <ul className="space-y-2 border-l border-slate-800 pl-4">
                        {aiBullets.map((pt, idx) => (
                          <li key={idx} className="relative text-[11px] text-slate-400 leading-normal">
                            <span className="text-amber-400 font-bold mr-1">•</span>
                            {pt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* 2. Tab Q&A */}
                {aiTab === 'qna' && (
                  <div className="space-y-4 flex flex-col h-full">
                    <form onSubmit={handleAiQnA} className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        placeholder="e.g. What is kubectl command?"
                        className="flex-1 bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </form>

                    {aiAnswer && (
                      <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl space-y-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">AI Assistant Response</span>
                        <p className="text-slate-200 leading-relaxed text-[11px] whitespace-pre-line">{aiAnswer}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tab Quiz */}
                {aiTab === 'quiz' && (
                  <div className="space-y-4">
                    {quizQuestions.length === 0 ? (
                      <div className="text-center py-6 text-slate-500">
                        Click 'Quiz Check' tab to load verification check questions.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {quizQuestions.map((q, qIdx) => (
                          <div key={qIdx} className="space-y-2">
                            <h4 className="font-bold text-slate-200 leading-normal">{qIdx + 1}. {q.question}</h4>
                            <div className="flex flex-col gap-1.5">
                              {q.options.map((opt: string, oIdx: number) => {
                                const isSelected = quizAnswers[qIdx] === oIdx;
                                const isCorrect = q.answerIndex === oIdx;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    disabled={quizSubmitted}
                                    onClick={() => handleSelectQuizAnswer(qIdx, oIdx)}
                                    className={`text-left p-2.5 rounded-lg border text-[11px] transition-all ${
                                      quizSubmitted
                                        ? isCorrect
                                          ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
                                          : isSelected
                                            ? 'border-rose-500/40 bg-rose-950/20 text-rose-400'
                                            : 'border-slate-900 bg-slate-950/40 text-slate-500'
                                        : isSelected
                                          ? 'border-primary-500 text-primary-400 bg-primary-950/20'
                                          : 'border-slate-850 bg-slate-900/30 hover:border-slate-700 text-slate-300'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Show explanation after submission */}
                            {quizSubmitted && q.explanation && (
                              <div className={`mt-1 p-2.5 rounded-lg text-[10px] leading-relaxed border ${
                                quizAnswers[qIdx] === q.answerIndex
                                  ? 'bg-emerald-950/10 border-emerald-800/30 text-emerald-400/80'
                                  : 'bg-amber-950/10 border-amber-800/30 text-amber-400/80'
                              }`}>
                                <span className="font-bold">Explanation:</span> {q.explanation}
                              </div>
                            )}
                          </div>
                        ))}

                        {!quizSubmitted ? (
                          <button
                            type="button"
                            onClick={handleQuizSubmit}
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-lg shadow-lg text-xs"
                          >
                            Submit Answers
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <div className={`p-3 rounded-lg border text-center font-bold ${
                              quizPassed 
                                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-950/20 border-rose-500/20 text-rose-400'
                            }`}>
                              {quizPassed
                                ? `Passed (${quizQuestions.length}/${quizQuestions.length} Correct)`
                                : `Verification Failed. Score: ${quizQuestions.filter((_: any, idx: number) => quizAnswers[idx] === _.answerIndex).length}/${quizQuestions.length}. Retry.`}
                            </div>
                            {!quizPassed && (
                              <button
                                type="button"
                                onClick={handleAiQuiz}
                                className="w-full bg-slate-900 border border-slate-800 text-slate-200 font-bold py-2 rounded-lg text-xs"
                              >
                                Try Again
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ====================================================
          NEW VERSION BUMP MODAL DIALOG
          ==================================================== */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-widest border-b border-slate-900 pb-2">
              Bump SOP Version Number
            </h3>
            
            <form onSubmit={handleCreateNewVersion} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Version Increment Severity</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBumpType('minor')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold transition-all ${
                      bumpType === 'minor'
                        ? 'border-primary-500 text-primary-400 bg-primary-950/25'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900/30'
                    }`}
                  >
                    Minor Increment (e.g. 1.0 → 1.1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBumpType('major')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold transition-all ${
                      bumpType === 'major'
                        ? 'border-primary-500 text-primary-400 bg-primary-950/25'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900/30'
                    }`}
                  >
                    Major Increment (e.g. 1.0 → 2.0)
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase">Version Changelog Description</label>
                <textarea
                  required
                  value={versionChangelog}
                  onChange={(e) => setVersionChangelog(e.target.value)}
                  placeholder="Describe the operational changes being introduced..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-900 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVersionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg"
                >
                  Create Version Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
