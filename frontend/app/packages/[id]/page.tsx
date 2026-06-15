'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Package, MapPin, Weight, DollarSign, Clock, Loader2, 
  Zap, Star, Shield, ArrowLeft, CheckCircle, AlertTriangle,
  ChevronRight, Leaf, Eye, EyeOff, Lock, MessageSquare
} from 'lucide-react';
import api, { Package as Pkg, Match } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import ChatModal from '@/components/ChatModal';
import ReviewModal from '@/components/ReviewModal';
import PaymentModal from '@/components/PaymentModal';
import { useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';

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
  
  // Delivery PIN states
  const [showPin, setShowPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  // Payment and Review states
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const [isEscrowFunded, setIsEscrowFunded] = useState(paymentStatus === 'success');
  const [isFunding, setIsFunding] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

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
  const acceptedMatch = pkg.matches?.find(m => m.isAccepted);
  const isCarrier = acceptedMatch?.travelerId === user?.id;
  
  const sortedMatches = [...matches].sort((a, b) => b.matchScore - a.matchScore);

  const handleDeliver = async () => {
    if (!pinInput || pinInput.length !== 4) {
      setDeliveryError('Please enter a 4-digit PIN');
      return;
    }
    
    setIsDelivering(true);
    setDeliveryError('');
    try {
      await api.deliverPackage(pkg.id, pinInput);
      const updated = await api.getPackage(pkg.id);
      setPkg(updated.data);
      // Delivery successful! Open the review modal so they can review the sender.
      setIsReviewOpen(true);
    } catch (err: any) {
      setDeliveryError(err.message || 'Invalid PIN');
    } finally {
      setIsDelivering(false);
    }
  };

  const handleFundEscrow = async () => {
    setIsFunding(true);
    try {
      const res: any = await api.fundEscrow(pkg.id);
      if (res.url) {
        window.location.href = res.url; // Redirect to Stripe Checkout
      }
    } catch (error) {
      console.error('Failed to initiate checkout', error);
      setIsFunding(false);
    }
  };

  const getChatPartnerName = () => {
    if (isOwner && acceptedMatch?.traveler) {
      return `${acceptedMatch.traveler.firstName} ${acceptedMatch.traveler.lastName}`;
    }
    if (isCarrier && pkg.user) {
      return `${pkg.user.firstName} ${pkg.user.lastName}`;
    }
    return 'User';
  };

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
                isLiveTracking={isTracking}
                matchId={acceptedMatch?.id}
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

                    <div className="mt-4 flex items-center justify-between gap-3">
                      {match.isAccepted ? (
                        <div className="flex items-center gap-1 text-sm text-emerald-400 font-medium">
                          <CheckCircle className="w-4 h-4" /> Match Accepted!
                        </div>
                      ) : match.isRejected ? (
                        <div className="flex items-center gap-1 text-sm text-gray-500 font-medium">
                          <AlertTriangle className="w-4 h-4" /> Match Rejected
                        </div>
                      ) : (
                        isOwner && (
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={async () => {
                                try {
                                  await api.acceptMatch(match.id);
                                  const updated = await api.getPackage(id);
                                  setPkg(updated.data);
                                  setMatches(updated.data.matches || []);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="btn-primary text-xs px-3 py-1.5 flex-1 sm:flex-none"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Accept Carrier
                            </button>
                          </div>
                        )
                      )}

                      <Link 
                        href={`/trips/${match.tripId}`} 
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors ml-auto"
                      >
                        View Trip Details <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          
            {/* Delivery PIN Section */}
          {(pkg.status === 'ACCEPTED' || pkg.status === 'DELIVERED') && (isOwner || isCarrier) && (
            <div className="glass-card p-6 border-indigo-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-lg font-bold font-syne text-white">Delivery Verification</h2>
                </div>
              </div>

              {/* Chat Button */}
              {pkg.status === 'ACCEPTED' && acceptedMatch && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-indigo-400" />
                    Chat
                  </button>
                  {isCarrier ? (
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
                                trackingSocket.emit('joinRoom', acceptedMatch.id);
                                (window as any).trackingSocket = trackingSocket;

                                const watchId = navigator.geolocation.watchPosition(
                                  (pos) => {
                                    trackingSocket.emit('shareLocation', {
                                      matchId: acceptedMatch.id,
                                      lat: pos.coords.latitude,
                                      lng: pos.coords.longitude
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
                      {isTracking ? 'Stop Sharing' : 'Share Location'}
                    </button>
                  ) : isOwner ? (
                    <button
                      onClick={() => setIsTracking(!isTracking)}
                      className={`w-full py-3 ${isTracking ? 'bg-indigo-500 text-white' : 'bg-indigo-500/20 text-indigo-400'} hover:bg-indigo-600 border border-indigo-500/30 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2`}
                    >
                      <MapPin className="w-4 h-4" />
                      {isTracking ? 'Hide Tracking' : 'Track Carrier'}
                    </button>
                  ) : null}
                </div>
              )}
              
              {pkg.status === 'DELIVERED' ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <div className="font-bold text-emerald-400">Package Delivered!</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {pkg.deliveredAt ? format(new Date(pkg.deliveredAt), 'PPp') : 'Verification successful'}
                  </div>
                </div>
              ) : isOwner ? (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    Give this 4-digit PIN to the person receiving the package. The Carrier needs it to complete the delivery and get paid.
                  </p>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-2xl font-black tracking-widest font-mono text-white">
                      {showPin ? pkg.deliveryPin : '••••'}
                    </div>
                    <button 
                      onClick={() => setShowPin(!showPin)}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ) : isCarrier ? (
                <div>
                  <p className="text-xs text-gray-400 mb-3">
                    When you hand over the package, ask the receiver for the 4-digit Delivery PIN to complete your job and unlock your payment!
                  </p>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                      className="input-field text-center tracking-widest font-mono font-bold text-lg"
                    />
                  </div>
                  
                  {deliveryError && (
                    <div className="mt-2 text-xs text-red-400">{deliveryError}</div>
                  )}
                  
                  <button 
                    onClick={handleDeliver}
                    disabled={isDelivering || pinInput.length !== 4}
                    className="btn-primary w-full mt-3 justify-center"
                  >
                    {isDelivering ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</>
                    ) : (
                      'Verify Delivery'
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          )}

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

            {/* Escrow Payment Action */}
            {isOwner && pkg.status === 'ACCEPTED' && (
              <div className="mt-6 pt-4 border-t border-white/10">
                {isEscrowFunded ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold text-emerald-400">Escrow Funded!</div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                  >
                    <Shield className="w-5 h-5" />
                    Secure Funds in Escrow
                  </button>
                )}
              </div>
            )}
            
            {/* Review Action */}
            {isOwner && pkg.status === 'DELIVERED' && (
               <button
                 onClick={() => setIsReviewOpen(true)}
                 className="w-full mt-4 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
               >
                 <Star className="w-5 h-5" />
                 Leave a Review
               </button>
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

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={pkg.rewardAmount}
        packageId={pkg.id}
        onPaymentSuccess={() => {
          setIsEscrowFunded(true);
        }}
      />

      {/* Chat Modal */}
      {acceptedMatch && (
        <ChatModal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          matchId={acceptedMatch.id}
          otherUserName={getChatPartnerName()}
        />
      )}

      {/* Review Modal */}
      {acceptedMatch && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          revieweeId={isOwner ? acceptedMatch.travelerId : pkg.userId}
          packageId={pkg.id}
          revieweeName={getChatPartnerName()}
        />
      )}
    </div>
  );
}
