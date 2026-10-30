import React, { useState } from 'react';
import {
  User,
  Lock,
  Database,
  Shield,
  CheckCircle,
  Server,
  Layers,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { RoleBadge } from '../components/Badge.tsx';
import { api } from '../services/api.ts';

export const SettingsPage: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const { success, error } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Name cannot be empty');
      return;
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        error('New passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        error('New password must be at least 6 characters');
        return;
      }
      if (!currentPassword) {
        error('Please enter your current password to set a new password');
        return;
      }
    }

    setIsUpdating(true);
    try {
      const res = await api.updateProfile({
        name,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      updateUserContext(res.user);
      success('Profile updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">System &amp; Profile Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials and review system configuration
        </p>
      </div>

      {/* Account Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-indigo-600" />
          <span>My Profile &amp; Credentials</span>
        </h3>

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Email is managed by the system administrator.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Change Password (Optional)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Saving Changes...' : 'Update Profile Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Role-Based Access Control (RBAC) Permissions Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-indigo-600" />
          <span>Role Permissions Matrix</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Your current active role is <RoleBadge role={user?.role || 'staff'} />
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">System Module</th>
                <th className="py-2.5 px-3 text-center">Admin</th>
                <th className="py-2.5 px-3 text-center">Manager</th>
                <th className="py-2.5 px-3 text-center">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  Dashboard &amp; Movement Trends
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">Product Catalog Management</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">CRUD</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">CRUD</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  Stock Movements (Stock In &amp; Stock Out)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  Low Stock &amp; Shortage Alerts
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Active</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Active</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Active</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">Supplier Directory</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">CRUD</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">CRUD</td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  Purchase Orders (Procurement &amp; Receiving)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-medium">Receive Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">Reports &amp; CSV Exports</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Allowed</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-slate-800">
                  User Account Management &amp; Security
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">Full Control</td>
                <td className="py-2.5 px-3 text-center text-rose-500 font-semibold">Restricted</td>
                <td className="py-2.5 px-3 text-center text-rose-500 font-semibold">Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* System Architecture Specifications */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-indigo-600" />
          <span>System Architecture &amp; Database Integrity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Database Engine</span>
            <p className="font-bold text-slate-800 mt-1">SQL Relational Storage</p>
            <p className="text-slate-500 text-[11px] mt-0.5">WAL mode, Foreign Keys ON</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Atomic Transactions</span>
            <p className="font-bold text-emerald-700 mt-1">ACID Guaranteed</p>
            <p className="text-slate-500 text-[11px] mt-0.5">Zero race-condition stock drift</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">Authentication</span>
            <p className="font-bold text-indigo-700 mt-1">JWT + bcrypt Hashing</p>
            <p className="text-slate-500 text-[11px] mt-0.5">Role verification on all API routes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
