import { Response } from 'express';
import { Department } from '../models/Department';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { logAction } from '../middleware/audit';

export const getDepartments = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    logger.error('Get departments error:', error);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;

  try {
    const existing = await Department.findOne({ name });
    if (existing) {
      res.status(400).json({ message: `Department '${name}' already exists` });
      return;
    }

    const dept = new Department({ name, description });
    await dept.save();

    await logAction({
      req,
      action: 'CREATE_DEPARTMENT',
      details: `Created department "${name}".`,
      diff: {
        after: { name, description }
      }
    });

    res.status(201).json(dept);
  } catch (error) {
    logger.error('Create department error:', error);
    res.status(500).json({ message: 'Failed to create department' });
  }
};
export const deleteDepartment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const dept = await Department.findById(id);
    if (!dept) {
      res.status(404).json({ message: 'Department not found' });
      return;
    }

    // Check if any users are still in this department
    const { User } = await import('../models/User');
    const userCount = await User.countDocuments({ department: id });
    if (userCount > 0) {
      res.status(400).json({
        message: `Cannot delete department — ${userCount} user(s) are still assigned to it. Reassign them first.`
      });
      return;
    }

    await Department.findByIdAndDelete(id);

    await logAction({
      req,
      action: 'DELETE_DEPARTMENT',
      details: `Deleted department "${dept.name}".`,
      diff: { before: { name: dept.name } }
    });

    res.json({ message: `Department "${dept.name}" deleted successfully` });
  } catch (error) {
    logger.error('Delete department error:', error);
    res.status(500).json({ message: 'Failed to delete department' });
  }
};
