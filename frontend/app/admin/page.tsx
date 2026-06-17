'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, DollarSign, ShieldAlert, CheckCircle, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashRes, usersRes]: any = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminUsers()
      ]);
      setStats(dashRes.data.overview);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string) => {
    try {
      await api.verifyAdminUser(userId);
      fetchData(); // Refresh list
    } catch (err) {
      alert('Failed to verify user');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Total Users</h3>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold font-syne">{stats?.totalUsers || 0}</div>
        </div>

        <div className="glass-card p-6 border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Escrow Flow</h3>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-syne text-emerald-400">₹{stats?.totalRevenue || 0}</div>
        </div>

        <div className="glass-card p-6 border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Active Packages</h3>
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-syne">{stats?.pendingPackages || 0}</div>
        </div>

        <div className="glass-card p-6 border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">High Risk Users</h3>
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold font-syne">{stats?.highRiskUsers || 0}</div>
        </div>
      </div>

      {/* User Management */}
      <div className="glass-card border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-syne">User Management & KYC</h2>
            <Link 
              href="/admin/kyc" 
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold transition-colors"
            >
              KYC & Disputes panel
            </Link>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-sm font-medium text-gray-400">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Trust Score</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-white flex items-center gap-2">
                      {u.firstName} {u.lastName}
                      {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="p-4 text-sm">
                    <span className="px-2 py-1 rounded-md bg-white/10 text-gray-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${u.trustScore > 80 ? 'bg-emerald-500' : u.trustScore > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${u.trustScore}%` }}
                        />
                      </div>
                      <span className="text-sm">{u.trustScore}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="p-4 text-right">
                    {!u.isVerified && (
                      <button 
                        onClick={() => handleVerify(u.id)}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm transition-colors"
                      >
                        Verify Identity
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
