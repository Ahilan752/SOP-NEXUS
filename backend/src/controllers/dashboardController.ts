import { Response } from 'express';
import mongoose from 'mongoose';
import { SOP } from '../models/SOP';
import { SOPVersion } from '../models/SOPVersion';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Acknowledgment } from '../models/Acknowledgment';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest, hasPermission } from '../middleware/auth';
import { Role } from '../models/Role';
import { logger } from '../utils/logger';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;

  try {
    const hasViewAudit = await hasPermission(user, 'VIEW_AUDIT');
    const hasCreateSop = await hasPermission(user, 'CREATE_SOP');

    if (hasViewAudit) {
      // ----------------------------------------------------
      // ADMIN DASHBOARD STATS
      // ----------------------------------------------------
      const rolesWithAck = await Role.find({ permissions: 'ACKNOWLEDGE_SOP' });
      const ackRoleNames = rolesWithAck.map(r => r.name);
      const totalEmployees = await User.countDocuments({ role: { $in: ackRoleNames } });

      const rolesWithCreateSop = await Role.find({ permissions: 'CREATE_SOP' });
      const creatorRoleNames = rolesWithCreateSop.map(r => r.name);
      const totalManagers = await User.countDocuments({ role: { $in: creatorRoleNames } });

      const totalUsers = await User.countDocuments();
      const departmentCount = await Department.countDocuments();
      const totalSops = await SOP.countDocuments({ isDeleted: false });

      // Gather status counts across latest versions (only for non-deleted SOPs)
      const activeSops = await SOP.find({ isDeleted: false }).select('_id');
      const activeSopIds = activeSops.map(s => s._id);

      const publishedCount = await SOPVersion.distinct('sopId', { status: 'Published', sopId: { $in: activeSopIds } }).then(res => res.length);
      const pendingCount = await SOPVersion.distinct('sopId', { status: 'Pending Approval', sopId: { $in: activeSopIds } }).then(res => res.length);
      const draftCount = await SOPVersion.distinct('sopId', { status: 'Draft', sopId: { $in: activeSopIds } }).then(res => res.length);
      const rejectedCount = await SOPVersion.distinct('sopId', { status: 'Rejected', sopId: { $in: activeSopIds } }).then(res => res.length);

      // Recharts: SOPs per department
      const depts = await Department.find();
      const sopsPerDept = await Promise.all(depts.map(async (d) => {
        const count = await SOP.countDocuments({ department: d._id, isDeleted: false });
        return { name: d.name, sops: count };
      }));

      // Recharts: Monthly updates trend dynamically generated from MongoDB
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const monthlyData = [];
      for (let m = 0; m <= currentMonthIndex; m++) {
        const startOfMonth = new Date(currentYear, m, 1);
        const endOfMonth = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
        
        const createdCount = await SOP.countDocuments({
          isDeleted: false,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        
        const publishedCount = await SOPVersion.countDocuments({
          status: 'Published',
          createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });
        
        monthlyData.push({
          month: monthNames[m],
          created: createdCount,
          published: publishedCount
        });
      }


      res.json({
        role: 'Admin',
        metrics: {
          totalEmployees,
          totalManagers,
          totalUsers,
          departments: departmentCount,
          totalSops,
          published: publishedCount,
          pendingApproval: pendingCount,
          draft: draftCount,
          rejected: rejectedCount
        },
        charts: {
          sopsPerDepartment: sopsPerDept,
          monthlyTrend: monthlyData
        }
      });
      return;
    } else if (hasCreateSop) {
      // ----------------------------------------------------
      // MANAGER DASHBOARD STATS
      // ----------------------------------------------------
      if (!user.department) {
        res.status(400).json({ message: 'Manager has no department assigned' });
        return;
      }

      const deptId = user.department;
      const deptSops = await SOP.find({ department: deptId, isDeleted: false });
      const deptSopIds = deptSops.map(s => s._id);

      // Statuses in this department
      const published = await SOPVersion.countDocuments({ sopId: { $in: deptSopIds }, status: 'Published' });
      const pending = await SOPVersion.countDocuments({ sopId: { $in: deptSopIds }, status: 'Pending Approval' });
      const drafts = await SOPVersion.countDocuments({ sopId: { $in: deptSopIds }, status: 'Draft' });
      const rejected = await SOPVersion.countDocuments({ sopId: { $in: deptSopIds }, status: 'Rejected' });

      // Total employees in department with acknowledge permission
      const rolesWithAck = await Role.find({ permissions: 'ACKNOWLEDGE_SOP' });
      const ackRoleNames = rolesWithAck.map(r => r.name);
      const deptEmployeesCount = await User.countDocuments({ department: deptId, role: { $in: ackRoleNames } });

      // Build overall acknowledgment rates for their department SOPs
      const reports = await Promise.all(
        deptSops.map(async (sop) => {
          const latestVersion = await SOPVersion.findOne({ sopId: sop._id, status: 'Published' }).sort({ createdAt: -1 });
          if (!latestVersion) return null;

          const ackCount = await Acknowledgment.countDocuments({ version: latestVersion._id });
          return {
            title: sop.title,
            version: latestVersion.versionNumber,
            read: ackCount,
            unread: Math.max(0, deptEmployeesCount - ackCount)
          };
        })
      );

      const filteredReports = reports.filter(Boolean);

      res.json({
        role: 'Manager',
        metrics: {
          totalSops: deptSops.length,
          published,
          pending,
          drafts,
          rejected,
          departmentEmployees: deptEmployeesCount
        },
        reports: filteredReports
      });
      return;
    } else {
      // ----------------------------------------------------
      // EMPLOYEE DASHBOARD STATS
      // ----------------------------------------------------
      if (!user.department) {
        res.status(400).json({ message: 'Employee has no department assigned' });
        return;
      }

      const deptId = user.department;
      
      // Get all published SOPs in employee's department
      const deptSops = await SOP.find({ department: deptId, isDeleted: false });
      const deptSopIds = deptSops.map(s => s._id);

      // Find published versions of these SOPs
      const publishedVersions = await SOPVersion.find({
        sopId: { $in: deptSopIds },
        status: 'Published'
      });

      const publishedVersionIds = publishedVersions.map(v => v._id);

      // Find which ones this user acknowledged
      const userAcks = await Acknowledgment.find({
        user: user._id,
        version: { $in: publishedVersionIds }
      });
      const ackVersionIds = userAcks.map(a => a.version.toString());

      // Unread = published versions that user has NOT acknowledged
      const unreadSops: any[] = [];
      const readSops: any[] = [];

      for (const ver of publishedVersions) {
        const sopDetails = deptSops.find(s => s._id.equals(ver.sopId));
        if (!sopDetails) continue;

        const isRead = ackVersionIds.includes(ver._id.toString());
        const entry = {
          sopId: ver.sopId,
          title: sopDetails.title,
          category: sopDetails.category,
          priority: sopDetails.priority,
          versionNumber: ver.versionNumber,
          publishedAt: ver.createdAt
        };

        if (isRead) {
          readSops.push(entry);
        } else {
          unreadSops.push(entry);
        }
      }

      // Recently updated SOPs in their department (e.g. within last 14 days)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentlyUpdatedCount = publishedVersions.filter(v => v.createdAt >= twoWeeksAgo).length;

      // Activity Feed (Recent notifications or updates in their department)
      const feed = await Notification.find({
        $or: [
          { recipient: user._id },
          { department: deptId },
          { recipient: null, department: null }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(10);

      res.json({
        role: 'Employee',
        metrics: {
          unreadSops: unreadSops.length,
          acknowledged: readSops.length,
          recentlyUpdated: recentlyUpdatedCount
        },
        unreadList: unreadSops,
        recentlyReadList: readSops.slice(0, 5),
        activityFeed: feed
      });
      return;
    }
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard metrics' });
  }
};
