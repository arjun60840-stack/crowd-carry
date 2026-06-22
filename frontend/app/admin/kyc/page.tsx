'use client';

import { useEffect, useState } from 'react';
import { 
  Shield, UserCheck, ShieldAlert, Award, FileSpreadsheet, 
  Check, X, Loader2, Scale, ShieldCheck, HelpCircle 
} from 'lucide-react';
import api from '@/lib/api';

export default function AdminKycPanel() {
  const [kycUsers, setKycUsers] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispute actions states
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);
  const [resolutionType, setResolutionType] = useState('WARNING');
  const [resNotes, setResNotes] = useState('');

  // Claim actions states
  const [resolvingClaimId, setResolvingClaimId] = useState<string | null>(null);
  const [settlementInput, setSettlementInput] = useState('');
  const [claimNotes, setClaimNotes] = useState('');

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, disputesRes, claimsRes]: any = await Promise.all([
        api.getAdminUsers(),
        api.getAdminDisputes(),
        api.getAdminInsuranceClaims(),
      ]);

      // Filter users who submitted KYC documents
      const pendingUsers = usersRes.data.filter((u: any) => u.kycStatus === 'PENDING');
      setKycUsers(pendingUsers);
      setDisputes(disputesRes.data);
      setClaims(claimsRes.data);
    } catch (err) {
      console.error('Failed to retrieve admin details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleVerifyKyc = async (userId: string, action: 'APPROVE' | 'REJECT', level: number) => {
    try {
      await api.verifyAdminKyc(userId, action, level);
      alert(`KYC processed: ${action} for level ${level}`);
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to process KYC verification');
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDisputeId) return;

    try {
      await api.resolveDispute(resolvingDisputeId, {
        resolution: resolutionType,
        resolutionNotes: resNotes,
      });
      alert('Dispute resolved successfully.');
      setResolvingDisputeId(null);
      setResNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve dispute');
    }
  };

  const handleResolveClaim = async (e: React.FormEvent, status: 'APPROVED' | 'REJECTED') => {
    e.preventDefault();
    if (!resolvingClaimId) return;

    let amount: number | undefined = undefined;
    if (status === 'APPROVED') {
      amount = parseFloat(settlementInput);
      if (isNaN(amount) || amount < 0) {
        alert('Please enter a valid approved settlement amount.');
        return;
      }
    }

    try {
      await api.resolveInsuranceClaim(resolvingClaimId, {
        status,
        settlementAmount: amount,
        adminNotes: claimNotes,
      });
      alert(`Claim successfully ${status.toLowerCase()}`);
      setResolvingClaimId(null);
      setSettlementInput('');
      setClaimNotes('');
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve claim');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-12">
      
      {/* 1. Pending KYC Verifications Section */}
      <div className="glass-card border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold font-syne">Pending KYC Reviews</h2>
        </div>
        
        {kycUsers.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No pending KYC submissions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase text-gray-400">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Aadhaar & PAN</th>
                  <th className="p-4 text-center">Selfie Proof</th>
                  <th className="p-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {kycUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-all text-sm">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      <div className="text-xs text-gray-400 mt-1">Current Level: {u.verificationLevel}</div>
                    </td>
                    <td className="p-4 font-mono text-xs">
                      <div>Aadhaar: {u.aadhaarNumber}</div>
                      <div>PAN: {u.panNumber}</div>
                    </td>
                    <td className="p-4 text-center">
                      {u.selfieImage ? (
                        <a href={u.selfieImage} target="_blank" rel="noreferrer" className="text-indigo-400 text-xs underline hover:text-indigo-300">
                          View Selfie Portrait
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">No Selfie</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-y-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleVerifyKyc(u.id, 'APPROVE', 2)}
                          className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold"
                        >
                          Approve ID (Lvl 2)
                        </button>
                        <button
                          onClick={() => handleVerifyKyc(u.id, 'APPROVE', 3)}
                          className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 text-purple-400 rounded-lg text-xs font-semibold"
                        >
                          Approve Selfie (Lvl 3)
                        </button>
                        <button
                          onClick={() => handleVerifyKyc(u.id, 'APPROVE', 4)}
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Trust Carrier (Lvl 4)
                        </button>
                        <button
                          onClick={() => handleVerifyKyc(u.id, 'REJECT', 0)}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Package Disputes Section */}
      <div className="glass-card border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold font-syne">Open Disputes</h2>
        </div>

        {disputes.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No active disputes.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase text-gray-400">
                  <th className="p-4">Package</th>
                  <th className="p-4">Dispute Type</th>
                  <th className="p-4">Filed By / Against</th>
                  <th className="p-4">Details</th>
                  <th className="p-4 text-right">Resolve Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5 transition-all text-sm">
                    <td className="p-4">
                      <div className="font-bold text-white">{d.package?.title}</div>
                      <div className="text-[10px] text-gray-500 font-mono">Pkg ID: {d.packageId}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-xs font-bold font-mono">
                        {d.type}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      <div>Reporter: <span className="text-white font-semibold">{d.reporter?.firstName} {d.reporter?.lastName}</span></div>
                      {d.reportedUser && (
                        <div>Against: <span className="text-white font-semibold">{d.reportedUser?.firstName} {d.reportedUser?.lastName}</span></div>
                      )}
                    </td>
                    <td className="p-4 text-xs text-gray-400 max-w-xs truncate" title={d.description}>
                      {d.description}
                    </td>
                    <td className="p-4 text-right">
                      {d.status === 'RESOLVED' ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <ShieldCheck className="w-4 h-4" />
                          Resolved ({d.resolution})
                        </span>
                      ) : (
                        <button
                          onClick={() => setResolvingDisputeId(d.id)}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-semibold transition-all"
                        >
                          Resolve Dispute
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispute Resolution Modal */}
      {resolvingDisputeId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleResolveDispute} className="glass-card max-w-md w-full p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold font-syne">Resolve Dispute Case</h3>
            <p className="text-xs text-gray-400">Determine resolution strategy. Penalties are updated dynamically.</p>
            
            <div className="space-y-2">
              <label className="text-xs block">Select Resolution Outcome</label>
              <select
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
              >
                <option value="WARNING" className="bg-space text-white">Issue User Warning</option>
                <option value="ACCOUNT_SUSPENSION" className="bg-space text-white">Suspend Carrier Profile</option>
                <option value="REFUND" className="bg-space text-white">Issue Refund to Sender</option>
                <option value="COMPENSATION" className="bg-space text-white">Issue Carrier Compensation</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs block">Resolution Notes</label>
              <textarea
                rows={3}
                required
                value={resNotes}
                onChange={(e) => setResNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                placeholder="Details of payout release, warnings, or suspension durations..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setResolvingDisputeId(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold"
              >
                Resolve Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Insurance Claims Section */}
      <div className="glass-card border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold font-syne">Insurance Claims</h2>
        </div>

        {claims.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No active insurance claims.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs font-semibold uppercase text-gray-400">
                  <th className="p-4">Package</th>
                  <th className="p-4">Claimant</th>
                  <th className="p-4 text-right">Amount Claimed</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {claims.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-all text-sm">
                    <td className="p-4">
                      <div className="font-bold text-white">{c.policy?.package?.title}</div>
                      <div className="text-[10px] text-gray-500 font-mono">Policy ID: {c.policyId}</div>
                    </td>
                    <td className="p-4 text-xs">
                      <div className="font-semibold">{c.claimant?.firstName} {c.claimant?.lastName}</div>
                      <div className="text-[10px] text-gray-500">{c.claimant?.email}</div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-emerald-400">
                      ₹{c.amountClaimed}
                    </td>
                    <td className="p-4 text-xs text-gray-400 max-w-xs truncate" title={c.description}>
                      {c.description}
                    </td>
                    <td className="p-4 text-right">
                      {c.status !== 'SUBMITTED' && c.status !== 'UNDER_REVIEW' ? (
                        <span className={`text-xs font-semibold ${c.status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {c.status} {c.settlementAmount ? `(₹${c.settlementAmount})` : ''}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setResolvingClaimId(c.id);
                            setSettlementInput(String(c.amountClaimed));
                          }}
                          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-semibold transition-all"
                        >
                          Process Claim
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim Processing Modal */}
      {resolvingClaimId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form className="glass-card max-w-md w-full p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold font-syne">Process Insurance Claim</h3>
            <p className="text-xs text-gray-400">Review coverage claims and approve/reject payouts.</p>

            <div className="space-y-2">
              <label className="text-xs block">Approved Settlement Amount (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={settlementInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setSettlementInput(val);
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs block">Resolution Notes</label>
              <textarea
                rows={3}
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:outline-none"
                placeholder="Add audit review context..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button 
                type="button" 
                onClick={() => setResolvingClaimId(null)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleResolveClaim(e, 'REJECTED')}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-semibold"
              >
                Reject Claim
              </button>
              <button
                onClick={(e) => handleResolveClaim(e, 'APPROVED')}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold"
              >
                Approve & Pay
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
