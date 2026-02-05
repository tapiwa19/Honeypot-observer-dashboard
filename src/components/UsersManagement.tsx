import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Shield, Mail, Calendar, Search } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  approved: boolean;
  createdAt: string;
}

export function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'approved' | 'pending'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [usersRes, pendingRes] = await Promise.all([
        axios.get(`${API_BASE}/auth/users`, { headers }),
        axios.get(`${API_BASE}/auth/pending-users`, { headers })
      ]);

      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/auth/approve-user/${userId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchData();
      alert('User approved successfully!');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/auth/reject-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchData();
      alert('User rejected successfully!');
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!confirm(`Change user role to ${newRole}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_BASE}/auth/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchData();
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Error changing role:', error);
      alert('Failed to change user role');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingUsers = pendingUsers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 mt-1">Manage user accounts and permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF] w-64"
            />
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-3">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeSubTab === 'pending'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-gray-400 hover:bg-gray-700/30'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          Pending Approval ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('approved')}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            activeSubTab === 'approved'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'text-gray-400 hover:bg-gray-700/30'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Active Users ({users.length})
        </button>
      </div>

      {/* Pending Users */}
      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          {filteredPendingUsers.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
              <UserCheck className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">No pending approvals</p>
              <p className="text-gray-500 text-sm mt-1">All users have been reviewed</p>
            </div>
          ) : (
            filteredPendingUsers.map((user) => (
              <div
                key={user._id}
                className="bg-orange-500/10 rounded-lg p-5 border border-orange-500/30 hover:border-orange-500/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{user.username}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.createdAt)}
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveUser(user._id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                    >
                      <UserCheck className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectUser(user._id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                    >
                      <UserX className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Active Users */}
      {activeSubTab === 'approved' && (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg">No active users</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                className="bg-gray-800/60 rounded-lg p-5 border border-gray-700 hover:border-[#00D9FF]/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{user.username}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                        user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </div>

                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user._id, e.target.value as 'admin' | 'member')}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#00D9FF] text-sm"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}