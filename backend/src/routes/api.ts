import { Router } from 'express';
import { login, getMe, getUsers, createUser, deleteUser, adminResetPassword, getRoles, createRole, deleteRole, changePassword } from '../controllers/authController';
import {
  createSOP,
  autoSaveDraft,
  submitForApproval,
  reviewSOP,
  createNewVersion,
  getSOPs,
  getSOPById,
  softDeleteSOP,
  acknowledgeSOP,
  getAcknowledgmentReport,
  addComment,
  uploadAttachment,
  deleteAttachment,
  aiSummarize,
  aiQnA,
  aiQuiz,
  toggleSaveSOP,
  getSavedSOPs
} from '../controllers/sopController';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/departmentController';
import { getAuditLogs } from '../middleware/audit';
import { getDashboardStats } from '../controllers/dashboardController';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticateJWT, requirePermission } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// ==========================================
// AUTH & USERS ROUTES
// ==========================================
router.post('/auth/login', login);
router.get('/auth/me', authenticateJWT, getMe);
router.get('/auth/users', authenticateJWT, requirePermission('VIEW_USERS'), getUsers);
router.post('/auth/users', authenticateJWT, requirePermission('CREATE_USER'), createUser);
router.delete('/auth/users/:id', authenticateJWT, requirePermission('DELETE_USER'), deleteUser);
router.put('/auth/users/:id/reset-password', authenticateJWT, requirePermission('CREATE_USER'), adminResetPassword);

// Roles routes
router.get('/auth/roles', authenticateJWT, requirePermission('CREATE_USER'), getRoles);
router.post('/auth/roles', authenticateJWT, requirePermission('CREATE_USER'), createRole);
router.delete('/auth/roles/:id', authenticateJWT, requirePermission('CREATE_USER'), deleteRole);
router.put('/auth/change-password', authenticateJWT, changePassword);

// ==========================================
// SOP MANAGEMENT ROUTES
// ==========================================
// IMPORTANT: Static routes MUST come before dynamic /:id routes
router.post('/sops', authenticateJWT, requirePermission('CREATE_SOP'), createSOP);
router.get('/sops', authenticateJWT, getSOPs);
router.get('/sops/saved/all', authenticateJWT, getSavedSOPs);  // static — must be before /sops/:id

// Dynamic :id routes
router.get('/sops/:id', authenticateJWT, getSOPById);
router.put('/sops/:id/draft', authenticateJWT, requirePermission('EDIT_SOP'), autoSaveDraft);
router.post('/sops/:id/submit', authenticateJWT, requirePermission('EDIT_SOP'), submitForApproval);
router.post('/sops/:id/review', authenticateJWT, requirePermission('APPROVE_SOP'), reviewSOP);
router.post('/sops/:id/version', authenticateJWT, requirePermission('CREATE_SOP'), createNewVersion);
router.post('/sops/:id/save', authenticateJWT, toggleSaveSOP);
router.delete('/sops/:id', authenticateJWT, requirePermission('DELETE_SOP'), softDeleteSOP);

// Acknowledgment & Reports
router.post('/sops/:id/versions/:versionId/acknowledge', authenticateJWT, requirePermission('ACKNOWLEDGE_SOP'), acknowledgeSOP);
router.get('/sops/:id/versions/:versionId/report', authenticateJWT, requirePermission('VIEW_REPORTS'), getAcknowledgmentReport);

// Version Interactions (Comments, Attachments)
router.post('/sops/versions/:versionId/comments', authenticateJWT, addComment);
router.post('/sops/versions/:versionId/attachments', authenticateJWT, requirePermission('EDIT_SOP'), upload.single('file'), uploadAttachment);
router.delete('/sops/versions/:versionId/attachments/:attachmentId', authenticateJWT, requirePermission('EDIT_SOP'), deleteAttachment);

// AI Assistant
router.get('/sops/versions/:versionId/ai/summary', authenticateJWT, aiSummarize);
router.post('/sops/versions/:versionId/ai/qna', authenticateJWT, aiQnA);
router.get('/sops/versions/:versionId/ai/quiz', authenticateJWT, aiQuiz);

// ==========================================
// DEPARTMENT ROUTES
// ==========================================
router.get('/departments', getDepartments);
router.post('/departments', authenticateJWT, requirePermission('CREATE_DEPARTMENT'), createDepartment);
router.delete('/departments/:id', authenticateJWT, requirePermission('CREATE_DEPARTMENT'), deleteDepartment);

// ==========================================
// AUDIT LOGS ROUTES
// ==========================================
router.get('/audit-logs', authenticateJWT, requirePermission('VIEW_AUDIT'), getAuditLogs);

// ==========================================
// DASHBOARD ROUTES
// ==========================================
router.get('/dashboard/stats', authenticateJWT, getDashboardStats);
router.get('/dashboard/inspect-db', async (_req, res) => {
  const { User } = await import('../models/User');
  const { Department } = await import('../models/Department');
  const { Role } = await import('../models/Role');
  const { SOP } = await import('../models/SOP');
  
  try {
    const roles = await Role.find({});
    const depts = await Department.find({});
    const users = await User.find({}).populate('department').select('-passwordHash');
    const sops = await SOP.find({}).populate('department');
    res.json({ roles, departments: depts, users, sops });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================
router.get('/notifications', authenticateJWT, getNotifications);
router.put('/notifications/read-all', authenticateJWT, markAllAsRead);
router.put('/notifications/:id/read', authenticateJWT, markAsRead);

export default router;
