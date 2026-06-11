'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Upload, ShieldCheck, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

export default function KYCPage() {
  const { user, refreshUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setError('');

    try {
      // In a real app, upload the file to S3/Cloudinary first
      const fakeUrl = `https://s3.amazonaws.com/kyc/${file.name}`;
      
      await api.submitKyc(fakeUrl);
      await refreshUser();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.isVerified) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="glass-card p-8 text-center border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black font-syne text-white mb-2">Identity Verified</h1>
          <p className="text-emerald-200/70 mb-6">
            Your identity has been verified. You now have the prestigious blue checkmark and full access to Crowd Carry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="glass-card p-8 border-indigo-500/30">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold font-syne text-white">Verify Your Identity</h1>
        </div>

        <p className="text-gray-400 mb-8 leading-relaxed">
          To build a safe and trusted community, we require all users to verify their identity before they can carry packages or send high-value items. Upload a government-issued ID (Passport, Driver's License, or National ID) to get your Verified Badge.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-emerald-400 mb-2">Documents Submitted</h3>
            <p className="text-sm text-emerald-200/70">
              Your documents have been automatically approved for this demo!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-8 text-center hover:bg-indigo-500/5 transition-colors group cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-white font-semibold mb-1">
                {file ? file.name : 'Upload ID Document'}
              </h3>
              <p className="text-sm text-gray-500">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Drag and drop or click to browse'}
              </p>
            </div>

            <button 
              type="submit" 
              disabled={!file || isSubmitting}
              className="btn-primary w-full justify-center py-4 text-lg"
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin mr-2" /> Processing...</>
              ) : (
                'Submit for Verification'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
