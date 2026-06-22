'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Package, MapPin, Weight, DollarSign, Clock, Loader2, 
  Zap, Star, Shield, ArrowLeft, CheckCircle, AlertTriangle,
  ChevronRight, Leaf, Eye, EyeOff, Lock, MessageSquare, QrCode
} from 'lucide-react';
import api, { Package as Pkg, Match } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import ChatModal from '@/components/ChatModal';
import ReviewModal from '@/components/ReviewModal';
import PaymentModal from '@/components/PaymentModal';
import { useSearchParams } from 'next/navigation';

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
  const [pkg, setPkg] = useState<any>(null);
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // QR Scan Scanner Simulation states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrScanType, setQrScanType] = useState<'PICKUP' | 'TRANSIT' | 'DELIVERY'>('PICKUP');
  const [qrPayloadInput, setQrPayloadInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Dispute & Claim states
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeType, setDisputeType] = useState('DAMAGED_PACKAGE');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [isFilingDispute, setIsFilingDispute] = useState(false);

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAmount, setClaimAmount] = useState('');
  const [claimDesc, setClaimDesc] = useState('');
  const [isFilingClaim, setIsFilingClaim] = useState(false);

  const fetchPkg = () => {
    api.getPackage(id)
      .then(res => {
        setPkg(res.data);
        setMatches(res.data.matches || []);
        
        const hasEscrowTransaction = res.data.transactions?.some(
          (t: any) => t.type === 'escrow_hold' && t.status === 'completed'
        );
        if (hasEscrowTransaction) {
          setIsEscrowFunded(true);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPkg();
  }, [id]);

  const handleFindMatches = async () => {
    setIsFindingMatches(true);
    setMatchMessage('');
    try {
      const res: any = await api.findMatches(id);
      setMatches(res.data?.matches || []);
      setMatchMessage(`Found ${res.data?.total || 0} potential matches!`);
      fetchPkg();
    } catch (err: any) {
      setMatchMessage('Failed to find matches');
    } finally {
      setIsFindingMatches(false);
    }
  };

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await api.acceptMatch(matchId);
      fetchPkg();
    } catch (err) {
      console.error('Failed to accept match');
    }
  };

  const handleDeliver = async () => {
    setIsDelivering(true);
    setDeliveryError('');
    try {
      await api.deliverPackage(id, pinInput);
      fetchPkg();
    } catch (err: any) {
      setDeliveryError(err.message || 'Delivery verification failed');
    } finally {
      setIsDelivering(false);
    }
  };

  const handleMockQrScan = async () => {
    setIsScanning(true);
    setScanMessage('');
    try {
      await api.scanPackage(id, {
        scanType: qrScanType,
        qrPayload: qrPayloadInput,
        latitude: 28.6139, // Simulated Delhi coords
        longitude: 77.2090,
      });
      setScanMessage('✅ Scan verified and timeline updated!');
      setIsQrModalOpen(false);
      fetchPkg();
    } catch (err: any) {
      setScanMessage(`❌ Error: ${err.message || 'Verification failed'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFilingDispute(true);
    try {
      await api.submitDispute({
        packageId: id,
        type: disputeType,
        description: disputeDesc,
      });
      alert('Dispute submitted successfully. Admins are reviewing.');
      setIsDisputeModalOpen(false);
      setDisputeDesc('');
      fetchPkg();
    } catch (err: any) {
      alert(err.message || 'Failed to file dispute');
    } finally {
      setIsFilingDispute(false);
    }
  };

  const handleFileClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsFilingClaim(true);
    const amount = parseFloat(claimAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid claim amount.');
      setIsFilingClaim(false);
      return;
    }
    const maxLimit = pkg?.estimatedValue || 10000;
    if (amount > maxLimit) {
      alert(`Claim amount cannot exceed the coverage limit of ₹${maxLimit}.`);
      setIsFilingClaim(false);
      return;
    }
    try {
      await api.submitInsuranceClaim({
        packageId: id,
        amountClaimed: amount,
        description: claimDesc,
      });
      alert('Insurance claim filed successfully.');
      setIsClaimModalOpen(false);
      setClaimAmount('');
      setClaimDesc('');
      fetchPkg();
    } catch (err: any) {
      alert(err.message || 'Failed to file claim');
    } finally {
      setIsFilingClaim(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (!pkg) return (
    <div className="text-center py-12">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold">Package Not Found</h3>
      <Link href="/dashboard" className="text-indigo-400 hover:underline mt-2 inline-block">
        Back to Dashboard
      </Link>
    </div>
  );

  const isOwner = user?.id === pkg.userId;
  const acceptedMatch = matches.find(m => m.isAccepted);
  const isCarrier = user?.id === acceptedMatch?.travelerId;
  const isChatPartnerName = () => isOwner ? `${acceptedMatch?.traveler?.firstName} ${acceptedMatch?.traveler?.lastName}` : `${pkg.user?.firstName} ${pkg.user?.lastName}`;

  // Package timeline progress steps
  const steps = ['CREATED', 'MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
  const currentStepIndex = steps.indexOf(pkg.status);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-black font-syne flex items-center gap-2">
              {pkg.title}
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[pkg.status] || 'bg-white/10 text-white'}`}>
                {pkg.status}
              </span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Package ID: {pkg.id}</p>
          </div>
        </div>
        
        {/* Verification Timeline status tracker */}
        <div className="flex items-center gap-2">
          {pkg.status !== 'DELIVERED' && pkg.status !== 'CANCELLED' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setQrScanType('PICKUP');
                  setQrPayloadInput(pkg.qrCodeData || ('cc-package-qr:' + pkg.id));
                  setIsQrModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                Scan Package QR
              </button>
              <button
                onClick={() => setIsDisputeModalOpen(true)}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-colors"
              >
                File Dispute
              </button>
            </div>
          )}
          {pkg.isInsured && pkg.status !== 'DELIVERED' && (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
            >
              File Claim
            </button>
          )}
        </div>
      </div>

      {/* Package Timeline Component */}
      <div className="glass-card p-6 border-white/5">
        <h3 className="font-bold font-syne mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Delivery Verification Timeline
        </h3>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 hidden md:block z-0" />
          
          {steps.map((step, idx) => {
            const isDone = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div key={step} className="flex flex-col items-center text-center relative z-10 w-full md:w-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold transition-all ${
                  isDone 
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-space border-white/10 text-gray-500'
                }`}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div className="mt-3">
                  <div className={`text-sm font-bold ${isCurrent ? 'text-indigo-400' : isDone ? 'text-white' : 'text-gray-500'}`}>
                    {step.replace('_', ' ')}
                  </div>
                  {pkg.packageHistories?.find((h: any) => h.status === step) && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(pkg.packageHistories.find((h: any) => h.status === step).createdAt), 'PPp')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Description, Map, matches) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Package details */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold font-syne">Package Details</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{pkg.description || 'No description provided.'}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <Weight className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Weight</div>
                <div className="font-semibold">{pkg.weight} kg</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <Package className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Size</div>
                <div className="font-semibold">{pkg.size}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Urgency</div>
                <div className="font-semibold text-amber-400">{pkg.urgency}</div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl text-center">
                <Shield className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="text-xs text-gray-400">Insurance</div>
                <div className="font-semibold text-emerald-400">
                  {pkg.isInsured ? pkg.insurancePlan : 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* Map View */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-bold font-syne">Shipping Route</h2>
            <div className="h-64 rounded-xl overflow-hidden border border-white/5">
              <MapView 
                pickup={{ lat: pkg.pickupLat || 28.6139, lng: pkg.pickupLng || 77.2090, label: pkg.pickupAddress || 'Delhi' }}
                destination={{ lat: pkg.destinationLat || 19.0760, lng: pkg.destinationLng || 72.8777, label: pkg.destinationAddress || 'Mumbai' }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400 pt-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">From</span>
                  {pkg.pickupAddress}, {pkg.pickupCity}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">To</span>
                  {pkg.destinationAddress}, {pkg.destinationCity}
                </div>
              </div>
            </div>
          </div>

          {/* Traveler matching list */}
          {isOwner && pkg.status === 'PENDING' && (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-syne">Potential Traveler Matches</h2>
                <button 
                  onClick={handleFindMatches}
                  disabled={isFindingMatches}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-semibold transition-colors"
                >
                  {isFindingMatches ? 'Finding...' : 'Scan Matches'}
                </button>
              </div>
              {matchMessage && <p className="text-sm text-indigo-400">{matchMessage}</p>}
              
              <div className="space-y-4">
                {matches.length === 0 ? (
                  <p className="text-sm text-gray-500">No travelers matched this route yet. Click Scan Matches to search.</p>
                ) : (
                  matches.map((m) => (
                    <div key={m.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-white">{m.traveler?.firstName} {m.traveler?.lastName}</div>
                        <div className="text-xs text-amber-400">⭐ {m.traveler?.rating} | Trust Score: {m.traveler?.trustScore}</div>
                        <div className="text-xs text-gray-400 mt-1">Match Quality: <span className="text-indigo-400 font-semibold">{m.matchQuality} ({Math.round(m.matchScore)}%)</span></div>
                      </div>
                      <button 
                        onClick={() => handleAcceptMatch(m.id)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Accept Match
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          
          {/* Escrow and Delivery PIN Panel */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold font-syne">Delivery Verification System</h3>
            
            {pkg.status === 'DELIVERED' ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <div className="font-bold text-emerald-400">Delivered Successfully!</div>
                <div className="text-xs text-gray-400 mt-1">
                  {pkg.deliveredAt ? format(new Date(pkg.deliveredAt), 'PPp') : 'Done'}
                </div>
              </div>
            ) : isOwner ? (
              <div>
                <p className="text-xs text-gray-400 mb-3">
                  Give this 4-digit PIN to the receiver. The carrier will ask for it if QR scanner fails.
                </p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-2xl font-black tracking-widest font-mono text-white">
                    {showPin ? pkg.deliveryPin : '••••'}
                  </div>
                  <button onClick={() => setShowPin(!showPin)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ) : isCarrier ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">
                  Enter the receiver's 4-digit PIN to complete the delivery and unlock your payment.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    maxLength={4}
                    placeholder="Enter PIN"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input-field text-center font-mono font-bold text-lg"
                  />
                </div>
                {deliveryError && <div className="text-xs text-red-400">{deliveryError}</div>}
                <button 
                  onClick={handleDeliver}
                  disabled={isDelivering || pinInput.length !== 4}
                  className="btn-primary w-full justify-center"
                >
                  {isDelivering ? 'Verifying...' : 'Verify Delivery PIN'}
                </button>
              </div>
            ) : null}
          </div>

          {/* Reward details */}
          <div className="glass-card p-6 space-y-4">
            <div className="text-xs text-gray-500 mb-1">Carrier Compensation</div>
            <div className="text-4xl font-black text-emerald-400 font-syne">₹{pkg.rewardAmount}</div>
            
            {isOwner && pkg.status === 'ACCEPTED' && !isEscrowFunded && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Fund Escrow Account
              </button>
            )}
            {isEscrowFunded && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <div className="text-xs text-emerald-400 font-semibold">Funds Secured in Escrow</div>
              </div>
            )}
          </div>

          {/* QR Code Display for Senders */}
          {isOwner && (pkg.qrCodeData || pkg.id) && (
            <div className="glass-card p-6 text-center space-y-4 border-dashed border-white/10">
              <h3 className="font-bold font-syne text-sm">Package QR Identity Code</h3>
              <div className="w-36 h-36 bg-white rounded-xl mx-auto flex items-center justify-center p-3">
                {/* SVG mock QR representation */}
                <div className="w-full h-full border border-black p-1 flex items-center justify-center bg-black text-white font-mono text-[9px] break-all leading-tight">
                  {pkg.qrCodeData || (`cc-package-qr:${pkg.id}`)}
                </div>
              </div>
              <p className="text-xs text-gray-400">Carriers scan this code on pickup and dropoff.</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Simulator Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold font-syne flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              QR Scanner Simulator
            </h3>
            <p className="text-xs text-gray-400">
              For evaluation reviews, select the current step and click simulated scan.
            </p>
            
            <div className="space-y-3">
              <label className="text-xs font-semibold block">Scan Event Type</label>
              <select
                value={qrScanType}
                onChange={(e) => setQrScanType(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="PICKUP" className="bg-space text-white">PICKUP Scan</option>
                <option value="TRANSIT" className="bg-space text-white">TRANSIT Scan</option>
                <option value="DELIVERY" className="bg-space text-white">DELIVERY Scan</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold block">Payload Scanned</label>
              <input
                type="text"
                value={qrPayloadInput}
                onChange={(e) => setQrPayloadInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
              />
            </div>

            {scanMessage && <div className="text-xs p-2.5 rounded-lg bg-white/5 text-gray-300">{scanMessage}</div>}

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleMockQrScan}
                disabled={isScanning}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                {isScanning ? 'Verifying...' : 'Simulate Scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Submission Modal */}
      {isDisputeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleFileDispute} className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold font-syne">Open Package Dispute</h3>
            <p className="text-xs text-gray-400">File a report to hold payment and alert support staff.</p>
            
            <div className="space-y-2">
              <label className="text-xs block">Issue Category</label>
              <select
                value={disputeType}
                onChange={(e) => setDisputeType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm"
              >
                <option value="DAMAGED_PACKAGE" className="bg-space">Damaged Package</option>
                <option value="LOST_PACKAGE" className="bg-space">Lost Package</option>
                <option value="WRONG_DELIVERY" className="bg-space">Wrong Delivery</option>
                <option value="CARRIER_MISCONDUCT" className="bg-space">Carrier Misconduct</option>
                <option value="PAYMENT_ISSUE" className="bg-space">Payment Issue</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs block">Describe what happened</label>
              <textarea
                rows={4}
                required
                value={disputeDesc}
                onChange={(e) => setDisputeDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                placeholder="Details of damage, loss, or misconduct..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setIsDisputeModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFilingDispute}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold"
              >
                {isFilingDispute ? 'Submitting...' : 'File Dispute'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Insurance Claim Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleFileClaim} className="glass-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold font-syne">Submit Insurance Claim</h3>
            <p className="text-xs text-gray-400">Coverage limit details: up to ₹{pkg.estimatedValue}</p>
            
            <div className="space-y-2">
              <label className="text-xs block">Settlement Amount Claimed (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                required
                value={claimAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setClaimAmount(val);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs block">Claim Description & Evidence Notes</label>
              <textarea
                rows={4}
                required
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                placeholder="Explain the damage or loss details..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFilingClaim}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold"
              >
                {isFilingClaim ? 'Filing Claim...' : 'Submit Claim'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Legacy modals */}
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        amount={pkg.rewardAmount}
        packageId={pkg.id}
        onPaymentSuccess={() => setIsEscrowFunded(true)}
      />
      {acceptedMatch && (
        <ChatModal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          matchId={acceptedMatch.id}
          otherUserName={isChatPartnerName()}
        />
      )}
      {acceptedMatch && (
        <ReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          revieweeId={isOwner ? acceptedMatch.travelerId : pkg.userId}
          packageId={pkg.id}
          revieweeName={isChatPartnerName()}
        />
      )}
    </div>
  );
}
