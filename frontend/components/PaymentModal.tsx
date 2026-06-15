'use client';

import { useState } from 'react';
import { X, CreditCard, Smartphone, CheckCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';
import api from '@/lib/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  packageId: string;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({ isOpen, onClose, amount, packageId, onPaymentSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState<'card' | 'upi' | 'wallet'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // UPI state
  const [upiId, setUpiId] = useState('');

  if (!isOpen) return null;

  const handlePay = async () => {
    setError('');

    // Basic validation
    if (method === 'card' && (cardNumber.length < 15 || expiry.length < 5 || cvv.length < 3)) {
      setError('Please fill in valid card details');
      return;
    }
    if (method === 'upi' && upiId.length < 5) {
      setError('Please enter a valid UPI ID');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Call backend escrow API to actually process the payment
      const response: any = await api.fundEscrow(packageId);
      
      if (response.success) {
        setIsProcessing(false);
        setIsSuccess(true);
        
        // Call success callback after showing the checkmark
        setTimeout(() => {
          onPaymentSuccess();
          setIsSuccess(false);
          onClose();
        }, 1500);
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || 'Payment processing failed. Please try again.');
    }
  };

  const handleCardNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += val[i];
    }
    setCardNumber(formatted.slice(0, 19));
  };

  const handleExpiry = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4);
    }
    setExpiry(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0a0a16] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 relative">
          <button 
            onClick={onClose}
            disabled={isProcessing || isSuccess}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold font-syne text-white">Secure Checkout</h2>
          </div>
          <p className="text-sm text-gray-400">Crowd Carry Escrow Protection</p>
        </div>

        {isSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Payment Successful</h3>
              <p className="text-gray-400 text-sm">Funds have been secured in Escrow.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-6 space-y-6">
              {/* Amount Display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <span className="text-gray-400">Total to Pay</span>
                <span className="text-2xl font-black text-emerald-400 font-syne">₹{amount}</span>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Method Selection */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setMethod('card')}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    method === 'card' 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-semibold">Card</span>
                </button>
                <button
                  onClick={() => setMethod('upi')}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    method === 'upi' 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-semibold">UPI</span>
                </button>
                <button
                  onClick={() => setMethod('wallet')}
                  disabled={isProcessing}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    method === 'wallet' 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center font-bold font-serif">G</div>
                  <span className="text-xs font-semibold">GPay</span>
                </button>
              </div>

              {/* Dynamic Input Area */}
              <div className="pt-2">
                {method === 'card' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Card Number</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000" 
                          value={cardNumber}
                          onChange={handleCardNumber}
                          disabled={isProcessing}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Expiry (MM/YY)</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          value={expiry}
                          onChange={handleExpiry}
                          disabled={isProcessing}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">CVV</label>
                        <input 
                          type="password" 
                          maxLength={3}
                          placeholder="•••" 
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                          disabled={isProcessing}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {method === 'upi' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">UPI ID</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                          type="text" 
                          placeholder="username@bank" 
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          disabled={isProcessing}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-4">
                      You will receive a payment request on your UPI app.
                    </p>
                  </div>
                )}

                {method === 'wallet' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 py-6 text-center">
                    <p className="text-sm text-gray-400">
                      Click below to authenticate with Google Pay.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl text-white font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing Secure Payment...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay ₹{amount}</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
