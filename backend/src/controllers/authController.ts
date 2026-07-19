import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Department } from '../models/Department';
import { Role } from '../models/Role';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { logAction } from '../middleware/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'sop-platform-jwt-secret-key-super-secure';

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).populate('department');
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Fetch user role permissions
    const roleObj = await Role.findOne({ name: user.role });
    const permissions = roleObj ? roleObj.permissions : [];

    // Track login in audit logs
    await logAction({
      req,
      action: 'LOGIN',
      details: `${user.name} logged in successfully as ${user.role}.`,
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
        department: user.department,
        savedSops: user.savedSops || []
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const roleObj = await Role.findOne({ name: req.user.role });
    const permissions = roleObj ? roleObj.permissions : [];

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      permissions,
      department: req.user.department,
      savedSops: req.user.savedSops || []
    });
  } catch (error) {
    logger.error('GetMe error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile data' });
  }
};

export const getUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().populate('department').select('-passwordHash');
    res.json(users);
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, email, password, role, departmentName } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    // Find department if provided
    let departmentId = null;
    if (departmentName && role !== 'Admin' && role !== 'Auditor') {
      const dept = await Department.findOne({ name: departmentName });
      if (!dept) {
        res.status(400).json({ message: `Department '${departmentName}' not found` });
        return;
      }
      departmentId = dept._id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      passwordHash,
      role,
      department: departmentId
    });

    await newUser.save();
    
    // Log audit log
    await logAction({
      req,
      action: 'CREATE_USER',
      details: `Created user ${name} (${email}) with role ${role}.`,
      diff: {
        after: { name, email, role, department: departmentName }
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: departmentId
      }
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await User.findByIdAndDelete(id);

    // Log audit log
    await logAction({
      req,
      action: 'DELETE_USER',
      details: `Deleted user ${userToDelete.name} (${userToDelete.email}).`,
      diff: {
        before: { name: userToDelete.name, email: userToDelete.email, role: userToDelete.role }
      }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const adminResetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: 'New password must be at least 6 characters.' });
    return;
  }

  try {
    const userToReset = await User.findById(id);
    if (!userToReset) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    userToReset.passwordHash = await bcrypt.hash(newPassword, salt);
    await userToReset.save();

    await logAction({
      req,
      action: 'ADMIN_RESET_PASSWORD',
      details: `Admin reset password for user ${userToReset.name} (${userToReset.email}).`
    });

    res.json({ message: `Password reset successfully for ${userToReset.name}.` });
  } catch (error) {
    logger.error('Admin reset password error:', error);
    res.status(500).json({ message: 'Failed to reset user password' });
  }
};

export const getRoles = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    logger.error('Get roles error:', error);
    res.status(500).json({ message: 'Failed to fetch roles' });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, permissions } = req.body;

  try {
    const existing = await Role.findOne({ name });
    if (existing) {
      res.status(400).json({ message: `Role '${name}' already exists` });
      return;
    }

    const role = new Role({ name, permissions });
    await role.save();

    await logAction({
      req,
      action: 'CREATE_ROLE',
      details: `Created role "${name}" with permissions: [${permissions.join(', ')}].`,
      diff: {
        after: { name, permissions }
      }
    });

    res.status(201).json(role);
  } catch (error) {
    logger.error('Create role error:', error);
    res.status(500).json({ message: 'Failed to create role' });
  }
};

export const deleteRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const roleToDelete = await Role.findById(id);
    if (!roleToDelete) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }

    if (req.user && req.user.role === roleToDelete.name) {
      res.status(400).json({ message: 'You cannot delete your own active role.' });
      return;
    }

    // Check if users are assigned to this role
    const assignedUsersCount = await User.countDocuments({ role: roleToDelete.name });
    if (assignedUsersCount > 0) {
      res.status(400).json({ message: `Cannot delete role '${roleToDelete.name}' - it is assigned to ${assignedUsersCount} user(s).` });
      return;
    }

    await Role.findByIdAndDelete(id);

    await logAction({
      req,
      action: 'DELETE_ROLE',
      details: `Deleted role "${roleToDelete.name}".`,
      diff: {
        before: { name: roleToDelete.name, permissions: roleToDelete.permissions }
      }
    });

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    logger.error('Delete role error:', error);
    res.status(500).json({ message: 'Failed to delete role' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'Current password and new password are required.' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ message: 'New password must be at least 6 characters.' });
    return;
  }

  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAction({
      req,
      action: 'CHANGE_PASSWORD',
      details: `${user.name} changed their password.`
    });

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password.' });
  }
};
