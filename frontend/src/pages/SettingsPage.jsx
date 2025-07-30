import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Users, 
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  RotateCcw,
  Database,
  Shield,
  Key,
  Trash2,
  Plus,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authAPI, usersAPI, settingsAPI } from '../services/api';

const SettingsPage = () => {
  const { user, changePassword } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // User management
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'salesman'
  });

  // Edit modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Data management state
  const [importFile, setImportFile] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      setError('Failed to fetch users');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      if (result.success) {
        setSuccess('Password changed successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (newUser.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await authAPI.register(newUser.username, newUser.password, newUser.role);
      
      if (response.data.success) {
        setSuccess('User added successfully');
        setShowAddUserModal(false);
        setNewUser({
          username: '',
          password: '',
          role: 'salesman'
        });
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      const response = await authAPI.deleteUser(id);
      if (response.data.success) {
        setSuccess('User deleted successfully');
        fetchUsers();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userItem) => {
    setEditUser({ ...userItem });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await usersAPI.updateRole(editUser.id, editUser.role);
      setSuccess("User updated successfully");
      setShowEditUserModal(false);
      setEditUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError(error.response?.data?.error || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  // Data management handlers
  const handleExportData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await settingsAPI.exportData();
      
      if (response.data.success) {
        const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccess('Data exported successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (e) => {
    e.preventDefault();
    
    if (!importFile) {
      setError('Please select a file to import');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          const response = await settingsAPI.importData(data);
          
          if (response.data.success) {
            setSuccess('Data imported successfully!');
            setShowImportModal(false);
            setImportFile(null);
            setTimeout(() => setSuccess(''), 3000);
            window.location.reload();
          }
        } catch (error) {
          setError('Invalid file format or failed to import data');
        }
      };
      
      reader.readAsText(importFile);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSystem = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL data including:\n\n' +
      '• All inventory items\n' +
      '• All sales records\n' +
      '• All expenses\n' +
      '• All user activity\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await settingsAPI.resetSystem();
      
      if (response.data.success) {
        setSuccess('System reset successfully!');
        setTimeout(() => setSuccess(''), 3000);
        window.location.reload();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset system');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, color: 'blue' },
    { id: 'password', name: 'Security', icon: Lock, color: 'green' },
    ...(user?.role === 'admin' ? [{ id: 'users', name: 'Users', icon: Users, color: 'purple' }] : []),
    { id: 'system', name: 'System', icon: SettingsIcon, color: 'orange' },
    ...(user?.role === 'admin' ? [{ id: 'data', name: 'Data', icon: Database, color: 'red' }] : [])
  ];

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
      green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
      purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
      orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600',
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color].split(' ')[2]} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${colorClasses[color].split(' ')[3]}`} />
          </div>
        </div>
      </div>
    );
  };

  const ActionCard = ({ title, description, icon: Icon, color = 'blue', onClick, buttonText, loading: cardLoading }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200',
      green: 'from-green-500 to-green-600 bg-green-50 text-green-600 border-green-200',
      purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600 border-purple-200',
      orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600 border-orange-200',
      red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200'
    };

    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-xl ${colorClasses[color].split(' ')[2]} flex items-center justify-center mr-4`}>
              <Icon className={`h-5 w-5 ${colorClasses[color].split(' ')[3]}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            </div>
          </div>
          <button
            onClick={onClick}
            disabled={cardLoading}
            className={`px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 ${
              color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
              color === 'green' ? 'bg-green-600 hover:bg-green-700' :
              color === 'purple' ? 'bg-purple-600 hover:bg-purple-700' :
              color === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
              'bg-red-600 hover:bg-red-700'
            }`}
          >
            {cardLoading ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-slate-600 text-sm">Manage your account and system preferences</p>
          </div>
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-1 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? `border-${tab.color}-500 text-${tab.color}-600`
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    title="Username"
                    value={user?.username}
                    icon={User}
                    color="blue"
                  />
                  <StatCard
                    title="Role"
                    value={user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    icon={Shield}
                    color="purple"
                  />
                  <StatCard
                    title="Account Created"
                    value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    icon={Key}
                    color="green"
                  />
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="max-w-md">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        className="block w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-slate-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && user?.role === 'admin' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
                  <button
                    onClick={() => setShowAddUserModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add User
                  </button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((userItem) => (
                          <tr key={userItem.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                                  <User className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-sm font-medium text-slate-900">{userItem.username}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                userItem.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : userItem.role === 'salesman'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {new Date(userItem.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {userItem.id !== user.id && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditUser(userItem)}
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(userItem.id)}
                                    className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mr-3">
                        <Database className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-blue-900">Backup Information</h4>
                    </div>
                    <p className="text-sm text-blue-800">
                      Reports are automatically saved to the POSBackups folder. 
                      Configure Google Drive sync to enable cloud backup.
                    </p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center mr-3">
                        <SettingsIcon className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-amber-900">System Requirements</h4>
                    </div>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Windows 10 or later</li>
                      <li>• USB Barcode Scanner (optional)</li>
                      <li>• ESC/POS Compatible Printer (optional)</li>
                      <li>• Internet connection for cloud backup</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && user?.role === 'admin' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <ActionCard
                    title="Export Data"
                    description="Export all system data including inventory, sales, expenses, and user data to a JSON file."
                    icon={Download}
                    color="blue"
                    onClick={handleExportData}
                    buttonText="Export Data"
                    loading={loading}
                  />

                  <ActionCard
                    title="Import Data"
                    description="Import previously exported data. This will replace all existing data."
                    icon={Upload}
                    color="green"
                    onClick={() => setShowImportModal(true)}
                    buttonText="Import Data"
                    loading={false}
                  />

                  <ActionCard
                    title="Reset System"
                    description="Clear all data and reset the system to factory settings. This action cannot be undone."
                    icon={RotateCcw}
                    color="red"
                    onClick={handleResetSystem}
                    buttonText="Reset System"
                    loading={loading}
                  />
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ Important Notes</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Always export your data before making any changes</li>
                        <li>• Import will replace all existing data</li>
                        <li>• System reset will permanently delete all data</li>
                        <li>• These actions are only available to administrators</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New User</h3>
              <form onSubmit={handleAddUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role *
                    </label>
                    <select
                      required
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="salesman">Salesman</option>
                      <option value="dataentry">Data Entry</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editUser && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit User</h3>
              <form onSubmit={handleUpdateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={editUser.username}
                      onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Role
                    </label>
                    <select
                      required
                      value={editUser.role}
                      onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    >
                      <option value="salesman">Salesman</option>
                      <option value="dataentry">Data Entry</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditUserModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Data Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-xl rounded-xl bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Import Data</h3>
              <form onSubmit={handleImportData}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Backup File *
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      required
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Select a previously exported JSON backup file
                    </p>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      ⚠️ <strong>Warning:</strong> Importing will replace all existing data. 
                      Make sure to export current data first if needed.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportFile(null);
                    }}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !importFile}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200"
                  >
                    {loading ? 'Importing...' : 'Import Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 