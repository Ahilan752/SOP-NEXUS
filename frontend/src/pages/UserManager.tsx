import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAppStore } from '../context/store';
import { Users, Building, Plus, Trash2, ShieldAlert, KeyRound, Search, X } from 'lucide-react';

export const UserManager: React.FC = () => {
  const { showToast, departments, fetchDepartments } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User Form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'Manager' | 'Employee'>('Employee');
  const [userDept, setUserDept] = useState('');

  // Password Reset state
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // User List Filters
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Department Form
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Roles state & Form
  const [roles, setRoles] = useState<any[]>([]);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const availablePermissions = [
    'CREATE_USER',
    'DELETE_USER',
    'VIEW_USERS',
    'CREATE_DEPARTMENT',
    'APPROVE_SOP',
    'DELETE_SOP',
    'VIEW_AUDIT',
    'VIEW_REPORTS',
    'VIEW_ALL_SOPS',
    'VIEW_DRAFTS',
    'CREATE_SOP',
    'EDIT_SOP',
    'UPLOAD_ATTACHMENT',
    'READ_SOP',
    'ACKNOWLEDGE_SOP'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchDepartments();
      const usersRes = await apiClient.get('/auth/users');
      setUsers(usersRes.data);
      const rolesRes = await apiClient.get('/auth/roles');
      setRoles(rolesRes.data);
    } catch (err) {
      showToast('Failed to load user management details', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = userSearchTerm.trim() === '' || 
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesRole = selectedRoleFilter === '' || u.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === '' || (u.department && u.department.name === selectedDeptFilter);

    return matchesSearch && matchesRole && matchesDept;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPassword) return;

    try {
      await apiClient.post('/auth/users', {
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
        departmentName: userDept || undefined
      });

      showToast('User created successfully!', 'SUCCESS');
      // Reset
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserDept('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create user', 'REJECTION');
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName || !deptDesc) return;

    try {
      await apiClient.post('/departments', {
        name: deptName,
        description: deptDesc
      });

      showToast('Department registered successfully!', 'SUCCESS');
      setDeptName('');
      setDeptDesc('');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to register department', 'REJECTION');
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === 'admin@sop.com') {
      showToast('Cannot delete master Administrator account', 'WARNING');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;

    try {
      await apiClient.delete(`/auth/users/${userId}`);
      showToast('User account deleted', 'SUCCESS');
      loadData();
    } catch (err) {
      showToast('Failed to delete user', 'REJECTION');
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!newPasswordVal || newPasswordVal.length < 6) {
      showToast('Password must be at least 6 characters.', 'WARNING');
      return;
    }
    try {
      const res = await apiClient.put(`/auth/users/${resettingUser._id}/reset-password`, { newPassword: newPasswordVal });
      showToast(res.data.message, 'SUCCESS');
      setResettingUser(null);
      setNewPasswordVal('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'REJECTION');
    }
  };

  const handleDeleteDept = async (deptId: string, deptName: string) => {
    if (!window.confirm(`Delete department "${deptName}"? This cannot be undone.`)) return;

    try {
      await apiClient.delete(`/departments/${deptId}`);
      showToast(`Department "${deptName}" deleted`, 'SUCCESS');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete department', 'REJECTION');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || selectedPermissions.length === 0) {
      showToast('Please specify a role name and select at least one permission', 'WARNING');
      return;
    }

    try {
      await apiClient.post('/auth/roles', {
        name: roleName,
        permissions: selectedPermissions
      });
      showToast(`Role "${roleName}" created!`, 'SUCCESS');
      setRoleName('');
      setSelectedPermissions([]);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create role', 'REJECTION');
    }
  };

  const handleDeleteRole = async (roleId: string, name: string) => {
    if (['Admin', 'Manager', 'Employee', 'Auditor'].includes(name)) {
      showToast('System protected roles cannot be deleted', 'WARNING');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete role "${name}"?`)) return;

    try {
      await apiClient.delete(`/auth/roles/${roleId}`);
      showToast(`Role "${name}" deleted`, 'SUCCESS');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete role', 'REJECTION');
    }
  };

  const handlePermissionCheckbox = (permission: string, checked: boolean) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permission]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permission));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-400" />
          User & Department Manager
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Add corporate departments, employees, and configure role assignments.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Creator Forms */}
          <div className="space-y-6 lg:col-span-1">
            {/* Create User Form */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-400" />
                Add Employee/Manager
              </h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g., Alex Johnson"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="e.g., employee@company.com"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {roles.map((r) => (
                        <option key={r._id} value={r.name} className="bg-slate-950">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                    <select
                      value={userDept}
                      onChange={(e) => setUserDept(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-950 text-slate-500">None</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d.name} className="bg-slate-950 text-slate-100">
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors mt-2"
                >
                  Create User Account
                </button>
              </form>
            </div>

            {/* Create Department Form */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Register Department
              </h3>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g., Security, Marketing"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                  <textarea
                    required
                    value={deptDesc}
                    onChange={(e) => setDeptDesc(e.target.value)}
                    placeholder="Describe the department's role within the organization..."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors mt-2"
                >
                  Register Department
                </button>
              </form>
            </div>

            {/* Create Role Form */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Register Custom Role
              </h3>
              <form onSubmit={handleCreateRole} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Role Name</label>
                  <input
                    type="text"
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g., Compliance Officer"
                    className="w-full bg-slate-900 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Permissions</label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-900 custom-scrollbar">
                    {availablePermissions.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 cursor-pointer text-[10px] font-medium text-slate-400 hover:text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm)}
                          onChange={(e) => handlePermissionCheckbox(perm, e.target.checked)}
                          className="rounded bg-slate-900 border-slate-800 text-primary-600 focus:ring-primary-500 w-3 h-3 cursor-pointer"
                        />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors mt-2"
                >
                  Register Role
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Users + Departments lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3 mb-4">
                <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">
                  User Accounts ({filteredUsers.length} of {users.length})
                </h3>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                  {userSearchTerm && (
                    <button
                      onClick={() => setUserSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Roles</option>
                    {roles.map(r => (
                      <option key={r._id} value={r.name}>{r.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedDeptFilter}
                    onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-900">
                    <tr>
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Department</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-900/10">
                        <td className="py-3">
                          <div className="font-bold text-slate-200">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'Admin'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : u.role === 'Manager'
                                ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-400">
                          {u.department?.name || <span className="text-slate-600">-</span>}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {u.email !== 'admin@sop.com' && (
                              <>
                                <button
                                  onClick={() => setResettingUser(u)}
                                  title={`Reset password for ${u.name}`}
                                  className="text-amber-400 hover:text-amber-300 p-1.5 hover:bg-amber-950/20 rounded transition-colors"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u._id, u.email)}
                                  title={`Delete ${u.name}`}
                                  className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/20 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Departments list */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Registered Departments ({departments.length})
              </h3>
              {departments.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">No departments registered yet. Use the form on the left to create one.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-900">
                      <tr>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">Description</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {departments.map((d) => (
                        <tr key={d._id} className="hover:bg-slate-900/10">
                          <td className="py-3">
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                              {d.name}
                            </div>
                          </td>
                          <td className="py-3 text-slate-500 max-w-[200px] truncate">
                            {(d as any).description || <span className="text-slate-700 italic">No description</span>}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteDept(d._id, d.name)}
                              title="Delete department"
                              className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Roles list */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Registered Roles ({roles.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[10px] text-slate-500 uppercase border-b border-slate-900">
                    <tr>
                      <th className="pb-3">Role</th>
                      <th className="pb-3">Permissions</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {roles.map((r) => {
                      const isSystemRole = ['Admin', 'Manager', 'Employee', 'Auditor'].includes(r.name);
                      return (
                        <tr key={r._id} className="hover:bg-slate-900/10">
                          <td className="py-3">
                            <div className="font-bold text-slate-200 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full inline-block ${isSystemRole ? 'bg-slate-500' : 'bg-amber-400'}`} />
                              {r.name}
                              {isSystemRole && <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-400 font-semibold uppercase">System</span>}
                            </div>
                          </td>
                          <td className="py-3 text-slate-400 max-w-[300px]">
                            <div className="flex flex-wrap gap-1">
                              {r.permissions.map((p: string) => (
                                <span key={p} className="text-[8px] bg-slate-900 text-slate-500 px-1 rounded border border-slate-850">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            {r.name !== useAppStore.getState().user?.role && (
                              <button
                                onClick={() => handleDeleteRole(r._id, r.name)}
                                title="Delete Role"
                                className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-950/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password
              </h4>
              <p className="text-[10px] text-slate-500 mt-1">Set a new temporary password for {resettingUser.name}.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">New Password</label>
              <input
                type="text"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary-500 placeholder:text-slate-700"
              />
            </div>
            <div className="flex gap-2 justify-end text-xs font-bold pt-2">
              <button
                onClick={() => { setResettingUser(null); setNewPasswordVal(''); }}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
