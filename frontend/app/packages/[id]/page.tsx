'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Package, MapPin, Weight, DollarSign, Clock, Loader2, 
  Zap, Star, Shield, ArrowLeft, CheckCircle, AlertTriangle,
  ChevronRight, Leaf
} from 'lucide-react';
import api, { Package as Pkg, Match } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamically import Map to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => (
  <div className="h-64 rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
  </div>
)});

const statusColors: Record<string, string> = {
  PENDING: 'status-pending', MATCHED: 'status-matched', ACCEPTED: 'status-accepted',
  PICKED_UP: 'status-picked-up', IN_TRANSIT: 'status-in-transit',
  DELIVERED: 'status-delivered', CANCELLED: 'status-cancelled',
};

export default function PackageDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');

  useEffect(() => {
    api.getPackage(id)
      .then(res => {
        setPkg(res.data);
        setMatches(res.data.matches || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleFindMatches = async () => {
    setIsFindingMatches(true);
    setMatchMessage('');
    try {
      const res: any = await api.findMatches(id);
      setMatches(res.data?.matches || []);
      setMatchMessage(`Found ${res.data?.total || 0} potential matches!`);
      // Refresh package
      const updated = await api.getPackage(id);
      setPkg(updated.data);
    } catch (err: any) {
      setMatchMessage('Failed to find matches');
    } finally {
      setIsFindingMatches(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (!pkg) return (
    <div className="text-center py-20">
      <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
      <h3 className="text-lg text-gray-400">Package not found</h3>
    </div>
  );

  const isOwner = user?.id === pkg.userId;
  const sortedMatches = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-4">
        <Link href="/packages" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black font-syne text-white">{pkg.title}</h1>
        <span className={`text-sm px-3 py-1 rounded-full border ${statusColors[pkg.status]}`}>
          {pkg.status.replace('_', ' ')}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Card */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold font-syne mb-4">Package Route</h2>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="w-0.5 h-16 bg-gradient-to-b from-green-400 to-red-400" />
                <div className="w-3 h-3 rounded-full bg-red-400" />
              </div>
              <div className="flex flex-col gap-8 flex-1">
                <div>
                  <div className="text-xs text-gray-500 mb-1">PICKUP</div>
                  <div className="font-semibold">{pkg.pickupCity}{pkg.pickupCountry ? `, ${pkg.pickupCountry}` : ''}</div>
                  <div className="text-sm text-gray-400">{pkg.pickupAddress}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">DESTINATION</div>
                  <div className="font-semibold">{pkg.destinationCity}{pkg.destinationCountry ? `, ${pkg.destinationCountry}` : ''}</div>
                  <div className="text-sm text-gray-400">{pkg.destinationAddress}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          {(pkg.pickupLat && pkg.destinationLat) && (
            <div className="glass-card p-4">
              <h2 className="text-lg font-bold font-syne mb-3">Route Map</h2>
              <MapView
                pickup={{ lat: pkg.pickupLat!, lng: pkg.pickupLng!, label: pkg.pickupCity }}
                destination={{ lat: pkg.destinationLat!, lng: pkg.destinationLng!, label: pkg.destinationCity }}
              />
            </div>
          )}

          {/* Package Info */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold font-syne mb-4">Package Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Weight', value: `${pkg.weight}kg`, icon: Weight },
                { label: 'Size', value: pkg.size, icon: Package },
                { label: 'Category', value: pkg.category, icon: Package },
                { label: 'Urgency', value: pkg.urgency, icon: Clock },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-white/5">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
            {pkg.description && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-xs text-gray-500 mb-1">Description</div>
                <p className="text-sm text-gray-300">{pkg.description}</p>
              </div>
            )}
          </div>

          {/* Risk Info */}
          <div className="glass-card p-4 flex items-center gap-3">
            <div className={`text-xs px-3 py-1.5 rounded-full border ${
              pkg.riskLevel === 'HIGH' ? 'risk-high' :
              pkg.riskLevel === 'MEDIUM' ? 'risk-medium' : 'risk-low'
            }`}>
              Risk: {pkg.riskLevel}
            </div>
            <div className="text-xs text-gray-500">Score: {pkg.riskScore?.toFixed(0)}/100</div>
          </div>

          {/* Matches Section */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-syne flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                AI Matches
              </h2>
              {isOwner && (
                <button
                  onClick={handleFindMatches}
                  disabled={isFindingMatches}
                  className="btn-primary text-sm px-4 py-2 gap-2"
                >
                  {isFindingMatches ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Finding...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Find Matches</>
                  )}
                </button>
              )}
            </div>

            {matchMessage && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-4">
                {matchMessage}
              </div>
            )}

            {sortedMatches.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No matches yet. Click "Find Matches" to search!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMatches.slice(0, 5).map((match) => (
                  <div key={match.id} className={`p-4 rounded-xl border transition-all ${
                    match.isAccepted ? 'border-emerald-500/30 bg-emerald-500/5' :
                    match.isRejected ? 'border-gray-700 bg-gray-900/50 opacity-50' :
                    'border-white/10 bg-white/5 hover:border-white/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shrink-0">
                          {match.traveler?.firstName?.[0]}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{match.traveler?.firstName} {match.traveler?.lastName}</div>
                          <div className="text-xs text-gray-400">
                            {match.trip?.sourceCity} → {match.trip?.destinationCity}
                            {match.trip?.travelDate && ` · ${format(new Date(match.trip.travelDate), 'MMM d')}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-black font-syne ${
                          match.matchScore >= 90 ? 'text-emerald-400' :
                          match.matchScore >= 75 ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          {match.matchScore?.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500">{match.matchQuality}</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-5 gap-1 mt-3 pt-3 border-t border-white/5">
                      {[
                        { label: 'Route', score: match.routeScore },
                        { label: 'Date', score: match.dateScore },
                        { label: 'Weight', score: match.weightScore },
                        { label: 'Rating', score: match.ratingScore },
                        { label: 'Success', score: match.successRateScore },
                      ].map((f) => (
                        <div key={f.label} className="text-center">
                          <div className="text-xs text-gray-600">{f.label}</div>
                          <div className="text-xs font-semibold text-gray-300">{f.score?.toFixed(0)}</div>
                        </div>
                      ))}
                    </div>

                    {match.explanation && (
                      <div className="mt-2 text-xs text-gray-500">{match.explanation}</div>
                    )}

                    {match.isAccepted && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Accepted
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Reward */}
          <div className="glass-card p-6">
            <div className="text-xs text-gray-500 mb-1">Your Reward Offer</div>
            <div className="text-4xl font-black text-emerald-400 font-syne">₹{pkg.rewardAmount}</div>

            {pkg.suggestedMin && (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Minimum</span>
                  <span className="text-white">₹{pkg.suggestedMin}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Recommended</span>
                  <span className="text-white">₹{pkg.suggestedRecommended}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Premium</span>
                  <span className="text-white">₹{pkg.suggestedPremium}</span>
                </div>
              </div>
            )}
          </div>

          {/* Sender */}
          <div className="glass-card p-6">
            <div className="text-xs text-gray-500 mb-3">Posted By</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                {pkg.user?.firstName?.[0]}
              </div>
              <div>
                <div className="font-medium">{pkg.user?.firstName} {pkg.user?.lastName}</div>
                <div className="flex items-center gap-1 text-sm text-amber-400">
                  ⭐ {pkg.user?.rating?.toFixed(1)}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              Posted {format(new Date(pkg.createdAt), 'MMM d, yyyy')}
            </div>
          </div>

          {/* CO2 Impact */}
          <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-semibold">Environmental Impact</span>
            </div>
            <div className="text-xs text-gray-400">
              This delivery could save approximately <span className="text-emerald-400 font-semibold">2-5kg CO₂</span> compared to traditional shipping.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
