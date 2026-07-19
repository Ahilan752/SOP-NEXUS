import { Request, Response } from 'express';
import { SOP } from '../models/SOP';
import { SOPVersion } from '../models/SOPVersion';
import { User } from '../models/User';
import { Acknowledgment } from '../models/Acknowledgment';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest, hasPermission } from '../middleware/auth';
import { Role } from '../models/Role';
import { logger } from '../utils/logger';
import { logAction } from '../middleware/audit';
import { SearchService } from '../utils/search';
import { io } from '../index';

// ==========================================
// 1. Create SOP (Initial Draft)
// ==========================================
export const createSOP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, category, priority, tags, content, changelog } = req.body;
  const user = req.user!;

  try {
    if (!user.department) {
      res.status(400).json({ message: 'Managers must belong to a department to create SOPs' });
      return;
    }

    const sop = new SOP({
      title,
      department: user.department,
      category,
      priority: priority || 'Medium',
      tags: tags || [],
      createdBy: user._id
    });

    await sop.save();

    const sopVersion = new SOPVersion({
      sopId: sop._id,
      versionNumber: '1.0',
      status: 'Draft',
      content: content || '',
      changelog: changelog || 'Initial Draft creation',
      createdBy: user._id,
      approvalHistory: [{
        fromStatus: 'None',
        toStatus: 'Draft',
        updatedBy: user._id,
        reason: 'Created draft',
        timestamp: new Date()
      }]
    });

    await sopVersion.save();

    await logAction({
      req,
      action: 'CREATE_SOP',
      details: `Created new SOP "${title}" (v1.0 Draft).`,
      diff: { after: { title, category, priority, tags, version: '1.0' } }
    });

    res.status(201).json({ sop, version: sopVersion });
  } catch (error) {
    logger.error('Create SOP error:', error);
    res.status(500).json({ message: 'Failed to create SOP' });
  }
};

// ==========================================
// 2. Auto-save Draft
// ==========================================
export const autoSaveDraft = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { content, changelog, title, category, priority, tags } = req.body;

  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) {
      res.status(404).json({ message: 'SOP not found' });
      return;
    }

    const draftVersion = await SOPVersion.findOne({
      sopId: id,
      status: { $in: ['Draft', 'Rejected'] }
    }).sort({ createdAt: -1 });

    if (!draftVersion) {
      res.status(400).json({ message: 'No editable draft version found for this SOP' });
      return;
    }

    if (title) sop.title = title;
    if (category) sop.category = category;
    if (priority) sop.priority = priority;
    if (tags) sop.tags = tags;
    await sop.save();

    if (content !== undefined) draftVersion.content = content;
    if (changelog !== undefined) draftVersion.changelog = changelog;
    await draftVersion.save();

    res.json({ message: 'Draft auto-saved successfully', sop, version: draftVersion });
  } catch (error) {
    logger.error('Auto-save draft error:', error);
    res.status(500).json({ message: 'Auto-save failed' });
  }
};

// ==========================================
// 3. Submit for Approval
// ==========================================
export const submitForApproval = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) {
      res.status(404).json({ message: 'SOP not found' });
      return;
    }

    const draftVersion = await SOPVersion.findOne({
      sopId: id,
      status: { $in: ['Draft', 'Rejected'] }
    }).sort({ createdAt: -1 });

    if (!draftVersion) {
      res.status(400).json({ message: 'No draft or rejected version available to submit' });
      return;
    }

    const oldStatus = draftVersion.status;
    draftVersion.status = 'Pending Approval';
    draftVersion.approvalHistory.push({
      fromStatus: oldStatus,
      toStatus: 'Pending Approval',
      updatedBy: user._id,
      reason: 'Submitted for approval',
      timestamp: new Date()
    });
    await draftVersion.save();

    const admins = await User.find({ role: 'Admin' });
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      message: `SOP "${sop.title}" (v${draftVersion.versionNumber}) has been submitted for approval by ${user.name}.`,
      type: 'APPROVAL' as const,
      link: `/admin/pending`
    }));
    await Notification.insertMany(notifications);

    if (io) {
      io.to('admins').emit('notification', {
        message: `SOP "${sop.title}" (v${draftVersion.versionNumber}) requires approval.`,
        type: 'APPROVAL'
      });
    }

    await logAction({
      req,
      action: 'SUBMIT_APPROVAL',
      details: `Submitted SOP "${sop.title}" (v${draftVersion.versionNumber}) for approval.`
    });

    res.json({ message: 'Submitted for approval successfully', version: draftVersion });
  } catch (error) {
    logger.error('Submit approval error:', error);
    res.status(500).json({ message: 'Failed to submit for approval' });
  }
};

// ==========================================
// 4. Admin Review (Approve / Reject)
// ==========================================
export const reviewSOP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, reason } = req.body;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) {
      res.status(404).json({ message: 'SOP not found' });
      return;
    }

    const pendingVersion = await SOPVersion.findOne({ sopId: id, status: 'Pending Approval' }).sort({ createdAt: -1 });
    if (!pendingVersion) {
      res.status(400).json({ message: 'No version pending approval' });
      return;
    }

    const creator = await User.findById(pendingVersion.createdBy);

    if (action === 'Approve') {
      pendingVersion.status = 'Published';
      pendingVersion.approvalHistory.push({
        fromStatus: 'Pending Approval',
        toStatus: 'Published',
        updatedBy: user._id,
        reason: reason || 'Approved and Published',
        timestamp: new Date()
      });
      await pendingVersion.save();

      const deptEmployees = await User.find({ department: sop.department });
      const notifs = deptEmployees.map(emp => ({
        recipient: emp._id,
        message: `"${sop.title}" (v${pendingVersion.versionNumber}) is published. Please acknowledge.`,
        type: 'SUCCESS' as const,
        link: `/sops/${sop._id}`
      }));
      if (creator && !deptEmployees.some(e => e._id.equals(creator._id))) {
        notifs.push({
          recipient: creator._id,
          message: `Your SOP "${sop.title}" v${pendingVersion.versionNumber} has been approved.`,
          type: 'SUCCESS' as const,
          link: `/sops/${sop._id}`
        });
      }
      await Notification.insertMany(notifs);

      if (io) {
        io.to(sop.department.toString()).emit('notification', {
          message: `New SOP: "${sop.title}" v${pendingVersion.versionNumber} published.`,
          type: 'SUCCESS'
        });
        if (creator) {
          io.to(creator._id.toString()).emit('notification', { message: `SOP "${sop.title}" approved!`, type: 'SUCCESS' });
        }
      }

      await logAction({ req, action: 'APPROVE_SOP', details: `Approved "${sop.title}" (v${pendingVersion.versionNumber}).` });
      res.json({ message: 'SOP approved and published', version: pendingVersion });
    } else if (action === 'Reject') {
      pendingVersion.status = 'Rejected';
      pendingVersion.approvalHistory.push({
        fromStatus: 'Pending Approval',
        toStatus: 'Rejected',
        updatedBy: user._id,
        reason: reason || 'Rejected',
        timestamp: new Date()
      });
      await pendingVersion.save();

      if (creator) {
        await Notification.create({
          recipient: creator._id,
          message: `Your SOP "${sop.title}" (v${pendingVersion.versionNumber}) was rejected. Reason: ${reason}`,
          type: 'REJECTION',
          link: `/sops/${sop._id}/edit`
        });
        if (io) io.to(creator._id.toString()).emit('notification', { message: `SOP rejected. Reason: ${reason}`, type: 'REJECTION' });
      }

      await logAction({ req, action: 'REJECT_SOP', details: `Rejected "${sop.title}" (v${pendingVersion.versionNumber}). Reason: ${reason}` });
      res.json({ message: 'SOP rejected', version: pendingVersion });
    } else {
      res.status(400).json({ message: 'Invalid action parameter' });
    }
  } catch (error) {
    logger.error('Review SOP error:', error);
    res.status(500).json({ message: 'Failed to review SOP' });
  }
};

// ==========================================
// 5. Create New Version
// ==========================================
export const createNewVersion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { bumpType, changelog } = req.body;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) { res.status(404).json({ message: 'SOP not found' }); return; }

    const activeVersion = await SOPVersion.findOne({ sopId: id, status: { $in: ['Draft', 'Pending Approval', 'Rejected'] } });
    if (activeVersion) {
      res.status(400).json({ message: `Active ${activeVersion.status} version (${activeVersion.versionNumber}) already exists.` });
      return;
    }

    const latestPublished = await SOPVersion.findOne({ sopId: id, status: 'Published' }).sort({ createdAt: -1 });
    if (!latestPublished) { res.status(400).json({ message: 'No published version to bump from' }); return; }

    const [majorStr, minorStr] = latestPublished.versionNumber.split('.');
    const newVersionNumber = bumpType === 'major'
      ? `${parseInt(majorStr, 10) + 1}.0`
      : `${majorStr}.${parseInt(minorStr, 10) + 1}`;

    const newVersion = new SOPVersion({
      sopId: id,
      versionNumber: newVersionNumber,
      status: 'Draft',
      content: latestPublished.content,
      changelog: changelog || `Bumping version (${bumpType})`,
      createdBy: user._id,
      attachments: latestPublished.attachments,
      approvalHistory: [{
        fromStatus: 'Published',
        toStatus: 'Draft',
        updatedBy: user._id,
        reason: `Created version ${newVersionNumber} draft`,
        timestamp: new Date()
      }]
    });
    await newVersion.save();

    await logAction({ req, action: 'CREATE_VERSION', details: `Created draft v${newVersionNumber} for "${sop.title}".` });
    res.status(201).json({ sop, version: newVersion });
  } catch (error) {
    logger.error('Create version error:', error);
    res.status(500).json({ message: 'Failed to create new version' });
  }
};

// ==========================================
// 6. Get SOPs
// ==========================================
export const getSOPs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const { search } = req.query;

  try {
    const canViewAll = await hasPermission(user, 'VIEW_ALL_SOPS');

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const depFilter = (!canViewAll && user.department) ? user.department.toString() : undefined;
      const results = await SearchService.search(search, depFilter);
      res.json(results);
      return;
    }

    const filter: any = { isDeleted: false };
    if (!canViewAll) {
      if (!user.department) { res.json([]); return; }
      filter.department = user.department;
    }

    const sops = await SOP.find(filter).populate('department', 'name').populate('createdBy', 'name email');

    const enrichedSops = await Promise.all(sops.map(async (sop) => {
      const latestPublished = await SOPVersion.findOne({ sopId: sop._id, status: 'Published' }).sort({ createdAt: -1 });
      const pendingOrDraft = await SOPVersion.findOne({ sopId: sop._id, status: { $in: ['Draft', 'Pending Approval', 'Rejected'] } }).sort({ createdAt: -1 });
      return {
        _id: sop._id,
        title: sop.title,
        department: sop.department,
        category: sop.category,
        priority: sop.priority,
        tags: sop.tags,
        createdBy: sop.createdBy,
        createdAt: sop.createdAt,
        updatedAt: sop.updatedAt,
        publishedVersion: latestPublished ? { versionNumber: latestPublished.versionNumber, createdAt: latestPublished.createdAt } : null,
        editableVersion: pendingOrDraft ? { versionNumber: pendingOrDraft.versionNumber, status: pendingOrDraft.status, createdAt: pendingOrDraft.createdAt } : null
      };
    }));

    res.json(enrichedSops);
  } catch (error) {
    logger.error('Get SOPs error:', error);
    res.status(500).json({ message: 'Failed to fetch SOPs' });
  }
};

// ==========================================
// 7. Get SOP By ID
// ==========================================
export const getSOPById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { versionNumber } = req.query;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id).populate('department', 'name').populate('createdBy', 'name email');
    if (!sop || sop.isDeleted) { res.status(404).json({ message: 'SOP not found' }); return; }

    const canViewAll = await hasPermission(user, 'VIEW_ALL_SOPS');
    if (!canViewAll) {
      const deptId = (sop.department as any)._id || sop.department;
      const userDeptId = user.department;
      if (!userDeptId || !userDeptId.equals(deptId)) {
        res.status(403).json({ message: 'Access denied to this department SOP' }); return;
      }
    }

    let selectedVersion: any = null;
    if (versionNumber) {
      selectedVersion = await SOPVersion.findOne({ sopId: id, versionNumber });
    } else {
      selectedVersion = await SOPVersion.findOne({ sopId: id, status: 'Published' }).sort({ createdAt: -1 });
      const canViewDrafts = await hasPermission(user, 'VIEW_DRAFTS');
      if (!selectedVersion && canViewDrafts) {
        selectedVersion = await SOPVersion.findOne({ sopId: id }).sort({ createdAt: -1 });
      }
    }

    if (!selectedVersion) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const allVersions = await SOPVersion.find({ sopId: id }).sort({ createdAt: -1 }).select('versionNumber status changelog createdAt');

    if (selectedVersion.status === 'Published') {
      await logAction({ req, action: 'VIEW_SOP', details: `Viewed "${sop.title}" v${selectedVersion.versionNumber}.` });
    }

    let acknowledged = await Acknowledgment.findOne({ user: user._id, version: selectedVersion._id });
    if (!acknowledged && selectedVersion.status === 'Published') {
      acknowledged = new Acknowledgment({
        user: user._id,
        sop: id,
        version: selectedVersion._id,
        openedAt: new Date()
      });
      await acknowledged.save();
    }

    res.json({ 
      sop, 
      version: selectedVersion, 
      versionsList: allVersions, 
      hasAcknowledged: acknowledged ? !!acknowledged.acknowledgedAt : false,
      readingHistory: acknowledged
    });
  } catch (error) {
    logger.error('Get SOP by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch SOP details' });
  }
};

// ==========================================
// 8. Soft Delete SOP
// ==========================================
export const softDeleteSOP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) { res.status(404).json({ message: 'SOP not found' }); return; }
    sop.isDeleted = true;
    await sop.save();
    await logAction({ req, action: 'DELETE_SOP', details: `Soft-deleted SOP "${sop.title}".`, diff: { before: { isDeleted: false }, after: { isDeleted: true } } });
    res.json({ message: 'SOP deleted successfully' });
  } catch (error) {
    logger.error('Delete SOP error:', error);
    res.status(500).json({ message: 'Failed to delete SOP' });
  }
};

// ==========================================
// 9. Acknowledge SOP
// ==========================================
export const acknowledgeSOP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, versionId } = req.params;
  const { quizScore } = req.body;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id);
    const version = await SOPVersion.findById(versionId);
    if (!sop || !version || version.status !== 'Published') { res.status(404).json({ message: 'Published SOP version not found' }); return; }

    let existing = await Acknowledgment.findOne({ user: user._id, version: versionId });
    if (existing && existing.acknowledgedAt) { res.status(400).json({ message: 'Already acknowledged this version' }); return; }

    if (!existing) {
      existing = new Acknowledgment({
        user: user._id,
        sop: id,
        version: versionId,
        openedAt: new Date()
      });
    }

    existing.acknowledgedAt = new Date();
    existing.timestamp = new Date(); // legacy fallback
    existing.quizScore = quizScore !== undefined ? quizScore : 100;
    await existing.save();

    await logAction({ req, action: 'ACKNOWLEDGE_SOP', details: `Acknowledged "${sop.title}" v${version.versionNumber}.` });
    res.json({ message: 'SOP acknowledged successfully', acknowledgment: existing });
  } catch (error) {
    logger.error('Acknowledge SOP error:', error);
    res.status(500).json({ message: 'Failed to acknowledge SOP' });
  }
};

// ==========================================
// 10. Acknowledgment Report
// ==========================================
export const getAcknowledgmentReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id, versionId } = req.params;
  try {
    const sop = await SOP.findById(id);
    const version = await SOPVersion.findById(versionId);
    if (!sop || !version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const rolesWithAck = await Role.find({ permissions: 'ACKNOWLEDGE_SOP' });
    const roleNames = rolesWithAck.map(r => r.name);
    const employees = await User.find({ department: sop.department, role: { $in: roleNames } }).select('name email');
    const acks = await Acknowledgment.find({ version: versionId });

    const readList: any[] = [];
    const unreadList: any[] = [];
    employees.forEach(emp => {
      const ack = acks.find(a => a.user.equals(emp._id));
      if (ack) readList.push({ _id: emp._id, name: emp.name, email: emp.email, timestamp: ack.timestamp });
      else unreadList.push(emp);
    });

    res.json({ sopTitle: sop.title, versionNumber: version.versionNumber, readCount: readList.length, unreadCount: unreadList.length, readList, unreadList });
  } catch (error) {
    logger.error('Acknowledgment report error:', error);
    res.status(500).json({ message: 'Failed to build report' });
  }
};

// ==========================================
// 11. Add Comment
// ==========================================
export const addComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId } = req.params;
  const { text } = req.body;
  const user = req.user!;

  try {
    const version = await SOPVersion.findById(versionId);
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const comment = { user: user._id, userName: user.name, role: user.role, text, timestamp: new Date() };
    version.comments.push(comment);
    await version.save();
    await logAction({ req, action: 'ADD_COMMENT', details: `Added comment to SOP version ${version.versionNumber}.` });
    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// ==========================================
// 12. Upload Attachment
// ==========================================
export const uploadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId } = req.params;
  const file = req.file;
  const user = req.user!;

  if (!file) { res.status(400).json({ message: 'No file uploaded' }); return; }

  try {
    const version = await SOPVersion.findById(versionId);
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const newAttachment = {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedBy: user._id,
      uploadedDate: new Date()
    };
    version.attachments.push(newAttachment);
    await version.save();
    await logAction({ req, action: 'UPLOAD_ATTACHMENT', details: `Uploaded "${file.originalname}" to v${version.versionNumber}.` });
    res.status(201).json({ message: 'Attachment uploaded', attachment: newAttachment });
  } catch (error) {
    logger.error('Upload attachment error:', error);
    res.status(500).json({ message: 'Upload failed' });
  }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId, attachmentId } = req.params;
  try {
    const version = await SOPVersion.findById(versionId);
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const attachment = version.attachments.find((a: any) => a._id?.toString() === attachmentId);
    if (!attachment) { res.status(404).json({ message: 'Attachment not found' }); return; }

    // Remove from array
    version.attachments = version.attachments.filter((a: any) => a._id?.toString() !== attachmentId);
    await version.save();

    // Optionally delete from local disk fs
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(__dirname, '../../uploads', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await logAction({ req, action: 'DELETE_ATTACHMENT', details: `Deleted attachment "${attachment.originalName}" from v${version.versionNumber}.` });
    res.json({ message: 'Attachment deleted successfully', attachments: version.attachments });
  } catch (error) {
    logger.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
};

// ==========================================
// 13. AI SOP Assistant APIs
// ==========================================
export const aiSummarize = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId } = req.params;
  try {
    const version = await SOPVersion.findById(versionId);
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const plainText = version.content.replace(/<[^>]*>/g, ' ');
    const sentences = plainText.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
    const bulletPoints = sentences
      .filter(s => s.toLowerCase().includes('must') || s.toLowerCase().includes('should') || s.toLowerCase().includes('step') || s.toLowerCase().includes('run') || s.length > 25)
      .slice(0, 5)
      .map(s => `${s}.`);

    if (bulletPoints.length === 0) bulletPoints.push('Follow the detailed steps listed in the standard guidelines.');

    res.json({ summary: 'This Standard Operating Procedure outlines operations and compliance protocols. Key highlights:', bullets: bulletPoints });
  } catch {
    res.status(500).json({ message: 'AI Summary generation failed' });
  }
};

export const aiQnA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId } = req.params;
  const { question } = req.body;
  try {
    const version = await SOPVersion.findById(versionId);
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const content = version.content;
    const lowerQ = question.toLowerCase();
    let answer = '';

    if (lowerQ.includes('command') || lowerQ.includes('run') || lowerQ.includes('code') || lowerQ.includes('terminal')) {
      const codeRegex = /<code>([\s\S]*?)<\/code>/gi;
      const codes: string[] = [];
      let match;
      while ((match = codeRegex.exec(content)) !== null) codes.push(match[1].trim());
      if (codes.length > 0) answer = `According to the SOP, run:\n${codes.map(c => `\`${c}\``).join('\n')}`;
    }

    if (!answer && (lowerQ.includes('step') || lowerQ.includes('how to') || lowerQ.includes('deploy') || lowerQ.includes('process'))) {
      const listRegex = /<li>([\s\S]*?)<\/li>/gi;
      const items: string[] = [];
      let match;
      while ((match = listRegex.exec(content)) !== null) items.push(match[1].replace(/<[^>]*>/g, '').trim());
      if (items.length > 0) answer = `Steps from this SOP:\n` + items.map((it, idx) => `${idx + 1}. ${it}`).join('\n');
    }

    if (!answer) {
      const plainText = content.replace(/<[^>]*>/g, ' ');
      const sentences = plainText.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
      const keyword = lowerQ.split(' ').find((w: string) => w.length > 4 && !['about', 'there', 'their', 'where', 'should', 'would', 'could'].includes(w));
      const matchSentence = keyword ? sentences.find(s => s.toLowerCase().includes(keyword)) : null;
      answer = matchSentence ? `Based on the SOP: "${matchSentence}."` : `Based on version ${version.versionNumber}, follow the checklist guidelines in the document.`;
    }

    res.json({ answer });
  } catch {
    res.status(500).json({ message: 'Q&A assistance failed' });
  }
};

export const aiQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { versionId } = req.params;
  try {
    const version = await SOPVersion.findById(versionId).populate('sopId');
    if (!version) { res.status(404).json({ message: 'SOP Version not found' }); return; }

    const rawHtml = version.content || '';
    const plainText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract list items (procedure steps)
    const listItemRegex = /<li>([\s\S]*?)<\/li>/gi;
    const steps: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = listItemRegex.exec(rawHtml)) !== null) {
      const clean = m[1].replace(/<[^>]*>/g, '').trim();
      if (clean.length > 10) steps.push(clean);
    }

    // Extract meaningful sentences from body text
    const sentences = plainText.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 20);

    // Filter to only actionable / process-relevant sentences
    const actionKeywords = ['must', 'should', 'shall', 'ensure', 'verify', 'check', 'perform', 'submit', 'complete', 'follow', 'report', 'notify', 'approve', 'review', 'prepare', 'maintain', 'record', 'document', 'contact', 'escalate', 'use', 'apply', 'wear', 'avoid', 'never', 'always', 'required', 'responsible', 'immediately', 'before', 'after', 'during', 'prior'];
    const actionSentences = sentences.filter(s => actionKeywords.some(kw => s.toLowerCase().includes(kw)));

    // Combine steps and action sentences into a pool
    const contentPool = [...steps, ...actionSentences];
    // De-duplicate
    const uniquePool = [...new Set(contentPool)].filter(s => s.length > 15);

    if (uniquePool.length < 2) {
      // Fallback: not enough content to generate a meaningful quiz
      res.json({
        quiz: [{
          question: 'What is the primary purpose of this Standard Operating Procedure?',
          options: [
            'To document and standardize the process described in this SOP',
            'To replace all existing company policies',
            'To serve as an optional reference only',
            'To outline employee vacation schedules'
          ],
          answerIndex: 0,
          explanation: 'SOPs are designed to document and standardize specific operational processes to ensure consistency and compliance.'
        }]
      });
      return;
    }

    // Shuffle the content pool
    const shuffled = [...uniquePool].sort(() => Math.random() - 0.5);

    // Generate questions (max 5)
    const quiz: { question: string; options: string[]; answerIndex: number; explanation: string }[] = [];
    const questionCount = Math.min(5, shuffled.length);

    // Question templates for variety
    const templates = [
      (step: string) => ({
        type: 'correct_action',
        question: `According to this SOP, which of the following is a correct procedure?`,
        correctAnswer: step,
      }),
      (step: string) => ({
        type: 'workplace_scenario',
        question: `An employee encounters a situation described in this SOP. What is the correct course of action?`,
        correctAnswer: step,
      }),
      (step: string) => ({
        type: 'requirement',
        question: `Which of the following requirements is stated in this SOP?`,
        correctAnswer: step,
      }),
      (step: string) => ({
        type: 'process_step',
        question: `What does this SOP instruct employees to do?`,
        correctAnswer: step,
      }),
      (step: string) => ({
        type: 'compliance',
        question: `To comply with this SOP, an employee must:`,
        correctAnswer: step,
      }),
    ];

    // Distractor generation: create plausible but wrong answers
    const generateDistractors = (correctAnswer: string, pool: string[], count: number): string[] => {
      const distractors: string[] = [];

      // Use other real sentences from the pool that are different enough
      const otherSentences = pool.filter(s => s !== correctAnswer && s.length > 15);
      const shuffledOthers = otherSentences.sort(() => Math.random() - 0.5);

      for (const s of shuffledOthers) {
        if (distractors.length >= count) break;
        // Only use if it's sufficiently different
        const overlap = correctAnswer.toLowerCase().split(' ').filter(w => s.toLowerCase().includes(w)).length;
        const totalWords = correctAnswer.split(' ').length;
        if (overlap / totalWords < 0.6) {
          distractors.push(s.length > 80 ? s.substring(0, 77) + '...' : s);
        }
      }

      // Fill remaining with generic plausible wrong answers
      const genericWrong = [
        'Skip this step as it is optional for experienced employees',
        'Delegate the task to another department without documentation',
        'Proceed without following the documented procedure',
        'Wait for verbal confirmation instead of following the written process',
        'Use personal judgment to bypass the standard procedure',
        'Complete the task without any record or documentation',
        'Ignore the requirement if time constraints apply',
        'Notify a colleague informally instead of following the escalation path',
      ];
      const shuffledGeneric = genericWrong.sort(() => Math.random() - 0.5);
      for (const g of shuffledGeneric) {
        if (distractors.length >= count) break;
        distractors.push(g);
      }

      return distractors.slice(0, count);
    };

    const usedTemplateIndices = new Set<number>();

    for (let i = 0; i < questionCount; i++) {
      const step = shuffled[i];
      const truncatedStep = step.length > 80 ? step.substring(0, 77) + '...' : step;

      // Pick a template (cycle through to ensure variety)
      let templateIdx = i % templates.length;
      // Try to avoid repeating the same template type consecutively
      if (usedTemplateIndices.has(templateIdx) && i < templates.length) {
        for (let t = 0; t < templates.length; t++) {
          if (!usedTemplateIndices.has(t)) { templateIdx = t; break; }
        }
      }
      usedTemplateIndices.add(templateIdx);
      if (usedTemplateIndices.size === templates.length) usedTemplateIndices.clear();

      const template = templates[templateIdx](step);
      const distractors = generateDistractors(step, shuffled, 3);

      // Place correct answer at a random position
      const options = [...distractors];
      const correctPos = Math.floor(Math.random() * (options.length + 1));
      options.splice(correctPos, 0, truncatedStep);

      quiz.push({
        question: template.question,
        options,
        answerIndex: correctPos,
        explanation: `The SOP states: "${truncatedStep}" — This is a documented requirement that employees must follow.`
      });
    }

    // Final shuffle of question order
    quiz.sort(() => Math.random() - 0.5);

    res.json({ quiz });
  } catch (error) {
    logger.error('AI Quiz generation error:', error);
    res.status(500).json({ message: 'Failed to generate Quiz' });
  }
};

// ==========================================
// 14. Library Management (Save / Bookmark)
// ==========================================
export const toggleSaveSOP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const sop = await SOP.findById(id);
    if (!sop || sop.isDeleted) {
      res.status(404).json({ message: 'SOP not found' });
      return;
    }

    const savedIndex = user.savedSops.indexOf(sop._id as any);
    let saved = false;

    if (savedIndex > -1) {
      user.savedSops.splice(savedIndex, 1);
      saved = false;
      await logAction({ req, action: 'UNSAVE_SOP', details: `Removed "${sop.title}" from My Library.` });
    } else {
      user.savedSops.push(sop._id as any);
      saved = true;
      await logAction({ req, action: 'SAVE_SOP', details: `Added "${sop.title}" to My Library.` });
    }

    await user.save();
    res.json({ message: saved ? 'Added to My Library' : 'Removed from My Library', saved, savedSops: user.savedSops });
  } catch (error) {
    logger.error('Toggle save SOP error:', error);
    res.status(500).json({ message: 'Failed to update My Library' });
  }
};

export const getSavedSOPs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  try {
    const userWithSops = await User.findById(user._id).populate({
      path: 'savedSops',
      match: { isDeleted: false },
      populate: [
        { path: 'department', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ]
    });

    if (!userWithSops) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const sops = userWithSops.savedSops || [];

    const enrichedSops = await Promise.all(sops.map(async (sop: any) => {
      const latestPublished = await SOPVersion.findOne({ sopId: sop._id, status: 'Published' }).sort({ createdAt: -1 });
      const pendingOrDraft = await SOPVersion.findOne({ sopId: sop._id, status: { $in: ['Draft', 'Pending Approval', 'Rejected'] } }).sort({ createdAt: -1 });
      return {
        _id: sop._id,
        title: sop.title,
        department: sop.department,
        category: sop.category,
        priority: sop.priority,
        tags: sop.tags,
        createdBy: sop.createdBy,
        createdAt: sop.createdAt,
        updatedAt: sop.updatedAt,
        publishedVersion: latestPublished ? { versionNumber: latestPublished.versionNumber, createdAt: latestPublished.createdAt } : null,
        editableVersion: pendingOrDraft ? { versionNumber: pendingOrDraft.versionNumber, status: pendingOrDraft.status, createdAt: pendingOrDraft.createdAt } : null
      };
    }));

    res.json(enrichedSops);
  } catch (error) {
    logger.error('Get saved SOPs error:', error);
    res.status(500).json({ message: 'Failed to fetch saved SOPs' });
  }
};
