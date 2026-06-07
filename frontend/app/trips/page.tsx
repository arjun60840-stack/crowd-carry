'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Plane, Loader2, MapPin, Weight, Clock, ChevronRight, Filter } from 'lucide-react';
import api, { Trip } from '@/lib/api';
import { format } from 'date-fns';

const vehicleIcons: Record<string, string> = {
  CAR: '🚗', MOTORCYCLE: '🏍️', BICYCLE: '🚲',
  PUBLIC_TRANSPORT: '🚌', WALK: '🚶', TRAIN: '🚂', FLIGHT: '✈️'
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const params: any = { page: String(page), limit: '12' };
      if (vehicleFilter) params.vehicleType = vehicleFilter;
      const res = await api.getTrips(params);
      setTrips(res.data || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch { } finally { setIsLoading(false); }
  };

  useEffect(() => { loadTrips(); }, [page, vehicleFilter]);

  const filtered = trips.filter(t =>
    search === '' ||
    t.sourceCity.toLowerCase().includes(search.toLowerCase()) ||
    t.destinationCity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-syne text-white">Available Trips</h1>
          <p className="text-gray-400 mt-1">Find travelers heading your way</p>
        </div>
        <Link href="/trips/new" className="btn-primary text-sm px-4 py-2 gap-2">
          <Plus className="w-4 h-4" /> Post Trip
        </Link>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cities..."
            className="input-field pl-10"
          />
        </div>
        <select
          value={vehicleFilter}
          onChange={e => setVehicleFilter(e.target.value)}
          className="input-field w-full sm:w-44"
        >
          <option value="">All Vehicles</option>
          <option value="CAR">Car</option>
          <option value="FLIGHT">Flight</option>
          <option value="TRAIN">Train</option>
          <option value="MOTORCYCLE">Motorcycle</option>
          <option value="BICYCLE">Bicycle</option>
          <option value="PUBLIC_TRANSPORT">Public Transport</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Plane className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-400 mb-2">No trips found</h3>
          <p className="text-gray-600 text-sm mb-6">Be the first to post a trip</p>
          <Link href="/trips/new" className="btn-primary text-sm px-6 py-2.5">Post a Trip</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}
              className="glass-card p-5 hover:border-white/20 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                    {trip.user?.firstName?.[0]}{trip.user?.lastName?.[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{trip.user?.firstName} {trip.user?.lastName}</div>
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      ⭐ {trip.user?.rating?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                </div>
                <span className="text-2xl">{vehicleIcons[trip.vehicleType] || '🚀'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-300 mb-2">
                <MapPin className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="truncate font-medium">{trip.sourceCity}</span>
                <span className="text-gray-600">→</span>
                <span className="truncate font-medium">{trip.destinationCity}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {format(new Date(trip.travelDate), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Weight className="w-3.5 h-3.5 text-purple-400" />
                  {trip.availableWeight}kg free
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {trip.user?.isTrustedTraveler && <span className="badge-trusted text-xs py-0.5 px-2">Trusted</span>}
                  {trip.user?.isTopCarrier && <span className="badge-top text-xs py-0.5 px-2">Top</span>}
                </div>
                {trip.pricePerKg && (
                  <div className="text-xs text-emerald-400 font-semibold">₹{trip.pricePerKg}/kg</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 disabled:opacity-50 hover:border-white/20 transition-all">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 rounded-xl border border-white/10 text-sm text-gray-400 disabled:opacity-50 hover:border-white/20 transition-all">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
