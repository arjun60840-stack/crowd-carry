'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  MapPin, Weight, DollarSign, Clock, Loader2, 
  Car, Calendar, Star, ArrowLeft, Leaf, Package, Zap
} from 'lucide-react';
import api, { Trip } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { io } from 'socket.io-client';

// Dynamically import Map to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false, loading: () => (
  <div className="h-64 rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
    <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
  </div>
)});

export default function TripDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    api.getTrip(id)
      .then(res => {
        setTrip(res.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (!trip) return (
    <div className="text-center py-20">
      <Car className="w-16 h-16 text-gray-700 mx-auto mb-4" />
      <h3 className="text-lg text-gray-400">Trip not found</h3>
    </div>
  );

  const isOwner = user?.id === trip.userId;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Back & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/trips" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black font-syne text-white">
            {trip.sourceCity} to {trip.destinationCity}
          </h1>
          <span className={`text-sm px-3 py-1 rounded-full border ${
            trip.isCompleted ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 
            trip.isActive ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 
            'border-gray-500/30 text-gray-400 bg-gray-500/10'
          }`}>
            {trip.isCompleted ? 'Completed' : trip.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {!isOwner && (
          <Link href="/packages/new" className="btn-primary gap-2 hidden md:flex">
            <Package className="w-4 h-4" /> Send Package with Carrier
          </Link>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route Card */}
          <div className="glass-card p-6 border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full blur-2xl" />
            <h2 className="text-lg font-bold font-syne mb-4">Travel Route</h2>
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                <div className="w-0.5 h-16 bg-gradient-to-b from-indigo-400 to-purple-400" />
                <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]" />
              </div>
              <div className="flex flex-col gap-8 flex-1">
                <div>
                  <div className="text-xs text-gray-500 mb-1">DEPARTURE</div>
                  <div className="font-semibold text-lg">{trip.sourceCity}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">ARRIVAL</div>
                  <div className="font-semibold text-lg">{trip.destinationCity}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          {(trip.sourceLat && trip.destinationLat) && (
            <div className="glass-card p-4">
              <h2 className="text-lg font-bold font-syne mb-3">Route Map</h2>
              <MapView
                pickup={{ lat: trip.sourceLat!, lng: trip.sourceLng!, label: trip.sourceCity }}
                destination={{ lat: trip.destinationLat!, lng: trip.destinationLng!, label: trip.destinationCity }}
              />
            </div>
          )}

          {/* Trip Details */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold font-syne mb-4">Trip Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Date', value: trip.travelDate ? format(new Date(trip.travelDate), 'MMM d, yyyy') : 'TBD', icon: Calendar },
                { label: 'Time', value: trip.travelTime || 'Flexible', icon: Clock },
                { label: 'Vehicle', value: trip.vehicleType, icon: Car },
                { label: 'Capacity', value: `${trip.availableWeight}kg`, icon: Weight },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
            {trip.notes && (
              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="text-xs text-gray-500 mb-1">Additional Notes</div>
                <p className="text-sm text-gray-300 bg-white/5 p-4 rounded-xl">{trip.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Tracking */}
          {isOwner && trip.isActive && trip.matches && trip.matches.some(m => m.package?.status === 'ACCEPTED') && (
            <div className="glass-card p-6 border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <h2 className="text-lg font-bold font-syne mb-4">Carrier GPS Tracking</h2>
              <p className="text-xs text-gray-400 mb-4">
                Share your live location with all senders who have accepted packages on this trip.
              </p>
              <button
                onClick={() => {
                  if (!isTracking) {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setIsTracking(true);
                          
                          // Set up live location watching
                          const token = localStorage.getItem('cc_token');
                          const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                          const trackingSocket = io(socketUrl, { auth: { token } });
                          
                          // Join all active match rooms
                          const activeMatches = trip.matches!.filter(m => m.package?.status === 'ACCEPTED');
                          activeMatches.forEach(match => {
                            trackingSocket.emit('joinRoom', match.id);
                          });
                          
                          (window as any).trackingSocket = trackingSocket;

                          const watchId = navigator.geolocation.watchPosition(
                            (pos) => {
                              // Broadcast to all active matches
                              activeMatches.forEach(match => {
                                trackingSocket.emit('shareLocation', {
                                  matchId: match.id,
                                  lat: pos.coords.latitude,
                                  lng: pos.coords.longitude
                                });
                              });
                            },
                            (err) => console.error(err),
                            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
                          );
                          (window as any).geoWatchId = watchId;
                        },
                        (err) => alert('Please enable GPS tracking to share your location.')
                      );
                    } else {
                      alert('Geolocation is not supported by your browser.');
                    }
                  } else {
                    setIsTracking(false);
                    if ((window as any).geoWatchId) {
                      navigator.geolocation.clearWatch((window as any).geoWatchId);
                    }
                    if ((window as any).trackingSocket) {
                      (window as any).trackingSocket.disconnect();
                    }
                  }
                }}
                className={`w-full py-3 ${isTracking ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'} border rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2`}
              >
                <MapPin className="w-4 h-4" />
                {isTracking ? 'Stop Broadcasting Location' : 'Broadcast Live Location'}
              </button>
            </div>
          )}

          {/* Assigned Packages */}
          {isOwner && trip.matches && trip.matches.length > 0 && (
            <div className="glass-card p-4">
              <h2 className="text-lg font-bold font-syne mb-3">Assigned Packages</h2>
              <div className="space-y-3">
                {trip.matches.map(match => (
                  <Link 
                    href={`/packages/${match.packageId}`}
                    key={match.id} 
                    className="block p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors"
                  >
                    <div className="font-semibold text-sm mb-1">{match.package?.title}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{match.package?.weight}kg</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        match.package?.status === 'DELIVERED' ? 'bg-emerald-500/10 text-emerald-400' :
                        match.package?.status === 'ACCEPTED' ? 'bg-indigo-500/10 text-indigo-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {match.package?.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Pricing */}
          <div className="glass-card p-6 border-emerald-500/20">
            <div className="text-xs text-gray-500 mb-1">Price per Kg</div>
            <div className="text-4xl font-black text-emerald-400 font-syne mb-2">
              {trip.pricePerKg ? `₹${trip.pricePerKg}` : 'Negotiable'}
            </div>
            <div className="text-xs text-gray-400">
              Pricing is set by the carrier. Final price may vary based on package size and urgency.
            </div>
          </div>

          {/* Traveler */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-bl-full blur-2xl" />
            <div className="text-xs text-gray-500 mb-3">Carrier Profile</div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold shrink-0">
                {trip.user?.firstName?.[0]}
              </div>
              <div>
                <div className="font-bold text-white">{trip.user?.firstName} {trip.user?.lastName}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-sm text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-amber-400" /> {trip.user?.rating?.toFixed(1) || 'New'}
                  </div>
                  {trip.user?.isTrustedTraveler && (
                    <div className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Trusted
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5 text-center">
              <div>
                <div className="text-xs text-gray-500">Completed</div>
                <div className="text-sm font-semibold">{trip.user?.completedDeliveries || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Success Rate</div>
                <div className="text-sm font-semibold">{trip.user?.successRate ? `${trip.user.successRate}%` : 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Mobile CTA */}
          {!isOwner && (
            <div className="md:hidden glass-card p-4 flex flex-col gap-2">
              <Link href="/packages/new" className="btn-primary justify-center gap-2 w-full">
                <Package className="w-4 h-4" /> Send Package
              </Link>
            </div>
          )}

          {/* CO2 Impact */}
          <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/5">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Leaf className="w-4 h-4" />
              <span className="text-sm font-semibold">Eco-Friendly Route</span>
            </div>
            <div className="text-xs text-emerald-100/70">
              Sending packages on this existing route helps reduce overall carbon emissions. Let's travel together!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
