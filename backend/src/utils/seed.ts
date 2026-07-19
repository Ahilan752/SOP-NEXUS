import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Department } from '../models/Department';
import { User } from '../models/User';
import { SOP } from '../models/SOP';
import { SOPVersion } from '../models/SOPVersion';
import { Role } from '../models/Role';
import { logger } from './logger';
import { connectDB, closeDB } from './db';

export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('Checking database status before seeding...');
    
    // Check if seeding is already done
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      logger.info('Database already seeded. Skipping seeding.');
      return;
    }

    logger.info('Starting database seeding...');

    // 1. Create Roles and Permissions
    const roleData = [
      {
        name: 'Admin',
        permissions: [
          'CREATE_USER',
          'DELETE_USER',
          'VIEW_USERS',
          'CREATE_DEPARTMENT',
          'APPROVE_SOP',
          'DELETE_SOP',
          'VIEW_AUDIT',
          'VIEW_REPORTS',
          'VIEW_ALL_SOPS',
          'VIEW_DRAFTS'
        ]
      },
      {
        name: 'Manager',
        permissions: [
          'CREATE_SOP',
          'EDIT_SOP',
          'UPLOAD_ATTACHMENT',
          'VIEW_REPORTS',
          'VIEW_DRAFTS'
        ]
      },
      {
        name: 'Employee',
        permissions: [
          'READ_SOP',
          'ACKNOWLEDGE_SOP'
        ]
      },
      {
        name: 'Auditor',
        permissions: [
          'READ_SOP',
          'VIEW_AUDIT',
          'VIEW_REPORTS',
          'VIEW_ALL_SOPS'
        ]
      }
    ];

    await Role.insertMany(roleData);
    logger.info(`Seeded ${roleData.length} roles and permission mappings.`);

    // 2. Create Departments
    const deptData = [
      { name: 'DevOps', description: 'Development Operations and Infrastructure Management' },
      { name: 'HR', description: 'Human Resources, Recruitment and Payroll' },
      { name: 'Finance', description: 'Accounting, Financial Reports, and Expense Approvals' },
      { name: 'IT', description: 'IT Support, Networking, and Assets Provisioning' },
      { name: 'Security', description: 'Cybersecurity, Access Logs, and Risk Compliance' },
      { name: 'Marketing', description: 'Product Brand Marketing and Public Relations' }
    ];

    const departments = await Department.insertMany(deptData);
    logger.info(`Seeded ${departments.length} departments.`);

    const devopsDept = departments.find(d => d.name === 'DevOps')!;
    const hrDept = departments.find(d => d.name === 'HR')!;
    const financeDept = departments.find(d => d.name === 'Finance')!;

    // 3. Create Users
    const salt = await bcrypt.genSalt(10);
    const hashPassword = async (pwd: string) => bcrypt.hash(pwd, salt);

    const usersData = [
      {
        name: 'System Admin',
        email: 'admin@sop.com',
        passwordHash: await hashPassword('admin123'),
        role: 'Admin',
        department: null
      },
      {
        name: 'Sarah Jenkins (DevOps Manager)',
        email: 'manager.devops@sop.com',
        passwordHash: await hashPassword('manager123'),
        role: 'Manager',
        department: devopsDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'John Doe (HR Manager)',
        email: 'manager.hr@sop.com',
        passwordHash: await hashPassword('manager123'),
        role: 'Manager',
        department: hrDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'Robert Vance (Finance Manager)',
        email: 'manager.finance@sop.com',
        passwordHash: await hashPassword('manager123'),
        role: 'Manager',
        department: financeDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'Rahul Kumar (DevOps Engineer)',
        email: 'employee.devops@sop.com',
        passwordHash: await hashPassword('employee123'),
        role: 'Employee',
        department: devopsDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'Priya Sharma (HR Coordinator)',
        email: 'employee.hr@sop.com',
        passwordHash: await hashPassword('employee123'),
        role: 'Employee',
        department: hrDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'Alex Green (Finance Analyst)',
        email: 'employee.finance@sop.com',
        passwordHash: await hashPassword('employee123'),
        role: 'Employee',
        department: financeDept._id as mongoose.Types.ObjectId
      },
      {
        name: 'Internal Auditor',
        email: 'auditor@sop.com',
        passwordHash: await hashPassword('auditor123'),
        role: 'Auditor',
        department: null
      }
    ];

    const users = await User.insertMany(usersData);
    logger.info(`Seeded ${users.length} users.`);

    const devopsManager = users.find(u => u.email === 'manager.devops@sop.com')!;
    const hrManager = users.find(u => u.email === 'manager.hr@sop.com')!;

    // 4. Create Sample SOPs
    const sop1 = await SOP.create({
      title: 'Deploy Kubernetes Application',
      department: devopsDept._id,
      category: 'Infrastructure',
      priority: 'High',
      tags: ['Kubernetes', 'Docker', 'K8s', 'AWS'],
      createdBy: devopsManager._id
    });

    await SOPVersion.create({
      sopId: sop1._id,
      versionNumber: '1.0',
      status: 'Published',
      content: `
        <h2>Deploying Application on EKS cluster</h2>
        <p>This standard operating procedure covers the steps to deploy containers to the production environment.</p>
        <h3>Prerequisites</h3>
        <ul>
          <li>Access to EKS cluster via kubectl configured.</li>
          <li>Docker image built and pushed to AWS ECR.</li>
        </ul>
        <h3>Step 1: Check Cluster Health</h3>
        <pre><code>kubectl get nodes</code></pre>
        <p>Ensure all nodes are in <strong>Ready</strong> state before deploying.</p>
        <h3>Step 2: Apply Kubernetes Manifests</h3>
        <p>Run the deployment scripts from the project workspace:</p>
        <pre><code>kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml</code></pre>
        <h3>Step 3: Verify Status</h3>
        <p>Ensure pods are running and services have acquired external IPs.</p>
      `,
      changelog: 'Initial version',
      createdBy: devopsManager._id,
      approvalHistory: [
        {
          fromStatus: 'Draft',
          toStatus: 'Published',
          updatedBy: users.find(u => u.role === 'Admin')!._id,
          reason: 'Initial setup approved',
          timestamp: new Date()
        }
      ]
    });

    const sop2 = await SOP.create({
      title: 'Annual Leave Policy',
      department: hrDept._id,
      category: 'Human Resources',
      priority: 'Low',
      tags: ['Leave', 'Holidays', 'Vacation', 'Policy'],
      createdBy: hrManager._id
    });

    await SOPVersion.create({
      sopId: sop2._id,
      versionNumber: '1.0',
      status: 'Published',
      content: `
        <h2>Employee Annual Leave Request Guidelines</h2>
        <p>All full-time employees are entitled to 20 days of paid annual leave per year, accrued monthly.</p>
        <h3>Leave Request Timeline</h3>
        <p>Requests must be submitted at least <strong>two weeks</strong> in advance through the HR Portal.</p>
        <h3>Approval Flow</h3>
        <ol>
          <li>Employee submits form online.</li>
          <li>Line Manager reviews and approves/rejects request.</li>
          <li>HR logs the leave balance update.</li>
        </ol>
      `,
      changelog: 'Official HR Board Release v1.0',
      createdBy: hrManager._id,
      approvalHistory: [
        {
          fromStatus: 'Draft',
          toStatus: 'Published',
          updatedBy: users.find(u => u.role === 'Admin')!._id,
          reason: 'Approved for distribution',
          timestamp: new Date()
        }
      ]
    });

    logger.info('Database seeding completed successfully.');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
};

// Check if running directly as a script
if (require.main === module) {
  const runSeed = async () => {
    await connectDB();
    await seedDatabase();
    await closeDB();
  };
  runSeed();
}
