'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Package, Filter, Loader2, MapPin, Weight, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api, { Package as Pkg } from '@/lib/api';

const statusColors: Record<string, string> = {
  PENDING: 'status-pending',
  MATCHED: 'status-matched',
  ACCEPTED: 'status-accepted',
  PICKED_UP: 'status-picked-up',
  IN_TRANSIT: 'status-in-transit',
  DELIVERED: 'status-delivered',
  CANCELLED: 'status-cancelled',
};

const urgencyColors: Record<string, string> = {
  STANDARD: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  EXPRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  URGENT: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [myOnly, setMyOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const params: any = { page: String(page), limit: '12' };
      if (statusFilter) params.status = statusFilter;
      if (myOnly) params.myPackages = 'true';
      const res = await api.getPackages(params);
      setPackages(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPackages(); }, [page, statusFilter, myOnly]);

  const filtered = packages.filter(p =>
    search === '' ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.pickupCity.toLowerCase().includes(search.toLowerCase()) ||
    p.destinationCity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-syne text-white">Packages</h1>
          <p className="text-gray-400 mt-1">Browse and manage delivery requests</p>
        </div>
        <Link href="/packages/new" className="btn-primary text-sm px-4 py-2 gap-2">
          <Plus className="w-4 h-4" /> Post Package
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search packages, cities..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field w-full sm:w-40"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="MATCHED">Matched</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
        </select>
        <button
          onClick={() => setMyOnly(!myOnly)}
          className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
            myOnly
              ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
              : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
          }`}
        >
          My Packages
        </button>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-2">No packages found</h3>
          <p className="text-gray-600 text-sm mb-6">Be the first to post a package delivery request</p>
          <Link href="/packages/new" className="btn-primary text-sm px-6 py-2.5">
            Post a Package
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pkg) => (
            <Link key={pkg.id} href={`/packages/${pkg.id}`}
              className="glass-card p-5 hover:border-white/20 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-syne truncate group-hover:text-indigo-300 transition-colors">
                    {pkg.title}
                  </h3>
                  <div className="text-xs text-gray-500 mt-0.5">
                    by {pkg.user?.firstName} {pkg.user?.lastName}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ml-2 shrink-0 ${statusColors[pkg.status]}`}>
                  {pkg.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{pkg.pickupCity}</span>
                <span className="text-gray-600">→</span>
                <span className="truncate">{pkg.destinationCity}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Weight</div>
                  <div className="text-sm font-semibold text-white">{pkg.weight}kg</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Reward</div>
                  <div className="text-sm font-semibold text-emerald-400">₹{pkg.rewardAmount}</div>
                </div>
                <div className="text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyColors[pkg.urgency]}`}>
                    {pkg.urgency}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">{pkg.size}</span>
                  <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">{pkg.category}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 disabled:opacity-50 hover:border-white/20 hover:text-white transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 disabled:opacity-50 hover:border-white/20 hover:text-white transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
