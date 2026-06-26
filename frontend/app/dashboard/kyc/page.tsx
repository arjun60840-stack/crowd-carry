'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Shield, CheckCircle, AlertCircle, Upload, Phone, FileText, 
  User, ArrowLeft, Loader2 
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function DashboardKycPage() {
  const { user, refreshUser } = useAuth();
  
  const [kycData, setKycData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Phone Verification states
  const [phoneInput, setPhoneInput] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // ID & Selfie Upload states
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [panInput, setPanInput] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  const fetchKycStatus = async () => {
    try {
      const res = await api.getKycStatus();
      setKycData(res.data);
    } catch (err) {
      console.error('Failed to retrieve KYC status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const handlePhoneVerify = async () => {
    setIsVerifyingPhone(true);
    try {
      await api.verifyPhone();
      alert('Phone verified successfully!');
      await refreshUser();
      fetchKycStatus();
    } catch (err: any) {
      alert(err.message || 'Phone verification failed');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingKyc(true);
    setStatusMessage('');

    if (aadhaarInput.length !== 12) {
      setStatusMessage('Aadhaar number must be exactly 12 digits');
      setIsSubmittingKyc(false);
      return;
    }

    if (panInput.length !== 10) {
      setStatusMessage('PAN number must be exactly 10 characters');
      setIsSubmittingKyc(false);
      return;
    }

    try {
      await api.submitUserKyc(aadhaarInput, panInput, selfieFile);
      setStatusMessage('🎉 KYC documents submitted successfully! Pending admin approval.');
      await refreshUser();
      fetchKycStatus();
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message || 'Submission failed'}`);
    } finally {
      setIsSubmittingKyc(false);
    }
  };

  const handleAutoApproveKyc = async () => {
    setIsAutoApproving(true);
    try {
      await api.autoApproveKyc();
      alert('KYC successfully approved in demo mode!');
      await refreshUser();
      fetchKycStatus();
    } catch (err: any) {
      alert(err.message || 'Auto-approval failed');
    } finally {
      setIsAutoApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const currentLevel = kycData?.verificationLevel ?? 0;
  const levels = [
    { num: 0, label: 'Email Verified', desc: 'Verify email registration link' },
    { num: 1, label: 'Phone Verified', desc: 'Simulate mobile phone OTP checks' },
    { num: 2, label: 'Government ID', desc: 'Input Aadhaar and PAN details' },
    { num: 3, label: 'Selfie Verified', desc: 'Submit camera portrait matching ID' },
    { num: 4, label: 'Trusted Carrier', desc: 'Elite status for vetted travelers' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-white">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black font-syne flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          Trust & Safety Verification
        </h1>
        <p className="text-sm text-gray-400">Upgrade your credentials to increase package matches and trust reputation.</p>
      </div>

      {/* KYC Levels Progress Tracker */}
      <div className="glass-card p-6 border-white/5 space-y-6">
        <h2 className="text-lg font-bold font-syne border-b border-white/5 pb-3">Your Trust Profile Level</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {levels.map((lvl) => {
            const active = lvl.num <= currentLevel;
            return (
              <div key={lvl.num} className={`p-4 rounded-xl border transition-all ${
                active 
                  ? 'bg-indigo-500/10 border-indigo-500/30' 
                  : 'bg-white/5 border-white/5 opacity-50'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    active ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
                  }`}>
                    Level {lvl.num}
                  </span>
                  {active && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <h4 className="font-bold text-sm">{lvl.label}</h4>
                <p className="text-[10px] text-gray-400 mt-1">{lvl.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verification Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left panel: Level 1 verification (Phone) */}
        <div className="glass-card p-6 border-white/5 space-y-6">
          <h3 className="text-md font-bold font-syne flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-400" />
            Level 1: Verify Mobile Number
          </h3>
          
          {kycData?.verificationLevel >= 1 ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-400">Verified</div>
                <div className="text-xs text-gray-400">Mobile verification successfully matches.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Input your phone number to receive confirmation code.
              </p>
              <div className="space-y-3">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                />
                <button
                  onClick={handlePhoneVerify}
                  disabled={isVerifyingPhone || !phoneInput}
                  className="btn-primary w-full justify-center"
                >
                  {isVerifyingPhone ? 'Verifying...' : 'Verify Phone'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Levels 2 & 3 Upload (Gov ID & Selfie) */}
        <div className="glass-card p-6 border-white/5 space-y-6">
          <h3 className="text-md font-bold font-syne flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Levels 2 & 3: Government ID & Selfie
          </h3>

          {kycData?.kycStatus === 'APPROVED' ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-emerald-400">KYC Status: APPROVED</div>
                <div className="text-xs text-gray-400">Your documents are fully approved by admin review.</div>
              </div>
            </div>
          ) : kycData?.kycStatus === 'PENDING' ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
                <div>
                  <div className="text-sm font-bold text-amber-400">KYC Status: PENDING</div>
                  <div className="text-xs text-gray-400">Admins are currently reviewing your documents.</div>
                </div>
              </div>
              {process.env.NODE_ENV !== 'production' && (
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-left">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Demo Mode Helper</h4>
                  <p className="text-[11px] text-gray-400">You can simulate admin review approval directly for testing.</p>
                  <button
                    onClick={handleAutoApproveKyc}
                    disabled={isAutoApproving}
                    className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isAutoApproving ? 'Approving...' : 'Auto-Approve Documents'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleKycSubmit} className="space-y-4">
              <p className="text-xs text-gray-400">
                Submit Aadhaar, PAN, and selfie verification coordinates.
              </p>

              <div className="space-y-2">
                <label className="text-xs block">Aadhaar Card Number (12 Digits)</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="1234 5678 9012"
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs block">PAN Card Number (10 Characters)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={panInput}
                  onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs block">Upload Selfie Image</label>
                <div className="border border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:bg-white/5 transition-all relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="selfie-file"
                  />
                  <label htmlFor="selfie-file" className="cursor-pointer space-y-1 block">
                    <Upload className="w-6 h-6 text-gray-400 mx-auto" />
                    <div className="text-xs text-gray-400">
                      {selfieFile ? selfieFile.name : 'Select portrait picture'}
                    </div>
                  </label>
                </div>
              </div>

              {statusMessage && <div className="text-xs text-indigo-400 p-2 bg-indigo-500/10 rounded-xl">{statusMessage}</div>}

              <button
                type="submit"
                disabled={isSubmittingKyc || !aadhaarInput || !panInput || !selfieFile}
                className="btn-primary w-full justify-center"
              >
                {isSubmittingKyc ? 'Submitting...' : 'Submit Documents'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Custom checkcircle2 svg representation since lucide icons might differ
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
