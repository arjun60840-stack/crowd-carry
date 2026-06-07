'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Package, Plane, Star, TrendingUp, Plus, ArrowRight,
  Clock, CheckCircle, Loader2, Leaf, AlertTriangle, Shield
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api, { Package as Pkg, Trip, Match } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  PENDING: 'status-pending',
  MATCHED: 'status-matched',
  ACCEPTED: 'status-accepted',
  PICKED_UP: 'status-picked-up',
  IN_TRANSIT: 'status-in-transit',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [pkgsRes, tripsRes] = await Promise.all([
          api.getPackages({ myPackages: 'true', limit: '5' }),
          api.getTrips({ limit: '5' } as any),
        ]);
        setPackages(pkgsRes.data || []);
        setTrips(tripsRes.data || []);
        if (user.role === 'TRAVELER') {
          const matchRes = await api.getMyMatches();
          setMyMatches(matchRes.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Trust Score',
      value: `${user?.trustScore?.toFixed(0) || 0}`,
      suffix: '/100',
      icon: Shield,
      color: 'text-indigo-400',
      bg: 'from-indigo-500/20 to-purple-500/10',
    },
    {
      label: 'Rating',
      value: user?.rating?.toFixed(1) || '0.0',
      suffix: '/5.0',
      icon: Star,
      color: 'text-amber-400',
      bg: 'from-amber-500/20 to-yellow-500/10',
    },
    {
      label: 'Deliveries',
      value: String(user?.completedDeliveries || 0),
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/20 to-green-500/10',
    },
    {
      label: 'Success Rate',
      value: `${Math.round((user?.successRate || 0) * 100)}%`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'from-blue-500/20 to-cyan-500/10',
    },
  ];

  const pendingMatches = myMatches.filter(m => !m.isAccepted && !m.isRejected);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-syne text-white">
            Welcome back, <span className="gradient-text">{user?.firstName}!</span>
          </h1>
          <p className="text-gray-400 mt-1">Here's what's happening with your deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/packages/new" className="btn-primary text-sm px-4 py-2 gap-2">
            <Plus className="w-4 h-4" /> New Package
          </Link>
          {user?.role === 'TRAVELER' && (
            <Link href="/trips/new" className="btn-secondary text-sm px-4 py-2 gap-2">
              <Plane className="w-4 h-4" /> Post Trip
            </Link>
          )}
        </div>
      </div>

      {/* Badges */}
      {(user?.isTrustedTraveler || user?.isVerifiedBadge || user?.isTopCarrier) && (
        <div className="flex flex-wrap gap-2">
          {user.isTrustedTraveler && (
            <span className="badge-trusted">🛡️ Trusted Traveler</span>
          )}
          {user.isVerifiedBadge && (
            <span className="badge-verified">✅ Verified</span>
          )}
          {user.isTopCarrier && (
            <span className="badge-top">🏆 Top Carrier</span>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`glass-card p-5 bg-gradient-to-br ${stat.bg}`}>
            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-black font-syne ${stat.color}`}>{stat.value}</span>
              {stat.suffix && <span className="text-gray-500 text-sm">{stat.suffix}</span>}
            </div>
            <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Pending Matches Alert */}
      {pendingMatches.length > 0 && (
        <div className="glass-card p-4 border-yellow-500/30 bg-yellow-500/5 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-yellow-300">
              {pendingMatches.length} Package{pendingMatches.length > 1 ? 's' : ''} Waiting for You
            </div>
            <div className="text-sm text-gray-400">Review and accept delivery requests that match your trips</div>
          </div>
          <Link href="/matches" className="btn-primary text-sm px-4 py-2 shrink-0">
            Review Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Packages */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-syne flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              My Packages
            </h2>
            <Link href="/packages" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No packages yet</p>
              <Link href="/packages/new" className="btn-primary text-sm px-4 py-2 mt-4 inline-flex">
                Post First Package
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <Link key={pkg.id} href={`/packages/${pkg.id}`} 
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{pkg.title}</div>
                    <div className="text-xs text-gray-500">
                      {pkg.pickupCity} → {pkg.destinationCity}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[pkg.status] || 'status-pending'}`}>
                    {pkg.status.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Trips */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold font-syne flex items-center gap-2">
              <Plane className="w-5 h-5 text-purple-400" />
              My Trips
            </h2>
            <Link href="/trips" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-10">
              <Plane className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No trips posted yet</p>
              <Link href="/trips/new" className="btn-secondary text-sm px-4 py-2 mt-4 inline-flex">
                Post a Trip
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <Link key={trip.id} href={`/trips/${trip.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Plane className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {trip.sourceCity} → {trip.destinationCity}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(trip.travelDate) > new Date()
                        ? `in ${formatDistanceToNow(new Date(trip.travelDate))}`
                        : 'Past trip'}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${
                    trip.isCompleted ? 'status-delivered' : 'status-matched'
                  }`}>
                    {trip.isCompleted ? 'Completed' : 'Active'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold font-syne mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/packages/new', label: 'Send Package', icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10 hover:bg-indigo-500/20' },
            { href: '/trips/new', label: 'Post Trip', icon: Plane, color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20' },
            { href: '/trips', label: 'Find Carriers', icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10 hover:bg-cyan-500/20' },
            { href: '/sustainability', label: 'CO₂ Impact', icon: Leaf, color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
          ].map((action) => (
            <Link key={action.href} href={action.href}
              className={`${action.bg} rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all duration-200 border border-white/5 hover:border-white/10`}>
              <action.icon className={`w-6 h-6 ${action.color}`} />
              <span className="text-sm font-medium text-gray-300">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
