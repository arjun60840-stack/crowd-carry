'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, Users, Package, Plane, BarChart3, 
  AlertTriangle, TrendingUp, Loader2, CheckCircle,
  Eye, DollarSign, Leaf, UserCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const loadData = async () => {
      try {
        const [dashRes, usersRes, reportsRes] = await Promise.all([
          api.getAdminDashboard(),
          api.getAdminUsers({ limit: '20' }),
          api.getAdminReports('PENDING'),
        ]);
        setData((dashRes as any).data);
        setUsers((usersRes as any).data || []);
        setReports((reportsRes as any).data || []);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    loadData();
  }, [user]);

  const handleVerifyUser = async (userId: string) => {
    try {
      await api.verifyUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: true } : u));
    } catch (err) { console.error(err); }
  };

  if (loading || isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  const overview = data?.overview || {};

  const pieData = (data?.charts?.packagesByStatus || []).map((s: any) => ({
    name: s.status.replace('_', ' '),
    value: s._count.id,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black font-syne text-white">Admin Panel</h1>
          <p className="text-gray-400 mt-0.5">Platform management and analytics</p>
        </div>
      </div>

      {/* Risk Alerts */}
      {(overview.highRiskUsers > 0 || overview.highRiskPackages > 0 || overview.pendingReports > 0) && (
        <div className="glass-card p-4 border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="text-sm">
              <span className="text-red-300 font-semibold">Attention Required: </span>
              <span className="text-gray-400">
                {overview.pendingReports > 0 && `${overview.pendingReports} pending reports, `}
                {overview.highRiskUsers > 0 && `${overview.highRiskUsers} high-risk users, `}
                {overview.highRiskPackages > 0 && `${overview.highRiskPackages} high-risk packages`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: overview.totalUsers || 0, icon: Users, color: 'text-indigo-400', bg: 'from-indigo-500/20 to-purple-500/10' },
          { label: 'Total Packages', value: overview.totalPackages || 0, icon: Package, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/10' },
          { label: 'Delivered', value: overview.deliveredPackages || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/10' },
          { label: 'Revenue ($)', value: `$${(overview.totalRevenue || 0).toFixed(0)}`, icon: DollarSign, color: 'text-amber-400', bg: 'from-amber-500/20 to-yellow-500/10' },
          { label: 'Active Trips', value: overview.activeTrips || 0, icon: Plane, color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/10' },
          { label: 'Travelers', value: overview.totalTravelers || 0, icon: UserCheck, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/10' },
          { label: 'CO₂ Saved (kg)', value: (overview.totalCO2Saved || 0).toFixed(1), icon: Leaf, color: 'text-green-400', bg: 'from-green-500/20 to-teal-500/10' },
          { label: 'Pending Reports', value: overview.pendingReports || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'from-red-500/20 to-orange-500/10' },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card p-4 bg-gradient-to-br ${stat.bg}`}>
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <div className={`text-2xl font-black font-syne ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {['overview', 'users', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Package Status Chart */}
          <div className="glass-card p-6">
            <h3 className="font-bold font-syne mb-4">Packages by Status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Users */}
          <div className="glass-card p-6">
            <h3 className="font-bold font-syne mb-4">Recent Registrations</h3>
            <div className="space-y-2">
              {(data?.recentUsers || []).slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {u.firstName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full border ${
                    u.riskLevel === 'HIGH' ? 'risk-high' :
                    u.riskLevel === 'MEDIUM' ? 'risk-medium' : 'risk-low'
                  }`}>
                    {u.riskLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold font-syne">All Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Trust</th>
                  <th className="text-left px-4 py-3">Risk</th>
                  <th className="text-left px-4 py-3">Deliveries</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10">{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-indigo-400">{u.trustScore?.toFixed(0)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        u.riskLevel === 'HIGH' ? 'risk-high' :
                        u.riskLevel === 'MEDIUM' ? 'risk-medium' : 'risk-low'
                      }`}>
                        {u.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{u.completedDeliveries}</td>
                    <td className="px-4 py-3">
                      {!u.isVerified && (
                        <button
                          onClick={() => handleVerifyUser(u.id)}
                          className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                        >
                          Verify
                        </button>
                      )}
                      {u.isVerified && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-bold font-syne">Pending Reports ({reports.length})</h3>
          </div>
          {reports.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-400">No pending reports. All clear! ✅</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {reports.map((report: any) => (
                <div key={report.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {report.reporter?.firstName} reported {report.reportedUser?.firstName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Reason: {report.reason}
                      </div>
                      <div className="text-sm text-gray-400 mt-2">{report.description}</div>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button
                        onClick={async () => {
                          await api.updateReport(report.id, { status: 'RESOLVED', adminNotes: 'Reviewed and resolved' });
                          setReports(prev => prev.filter(r => r.id !== report.id));
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={async () => {
                          await api.updateReport(report.id, { status: 'DISMISSED' });
                          setReports(prev => prev.filter(r => r.id !== report.id));
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 border border-gray-500/30 hover:bg-gray-500/20"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
