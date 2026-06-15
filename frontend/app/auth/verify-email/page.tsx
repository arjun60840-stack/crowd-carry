'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setError('Missing verification token. Please check the link from your email.');
        setIsLoading(false);
        return;
      }

      try {
        await api.verifyEmailWithToken(token);
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } catch (err: any) {
        setError(err.message || 'Failed to verify email. The verification link might be expired or invalid.');
      } finally {
        setIsLoading(false);
      }
    };

    performVerification();
  }, [token, router]);

  return (
    <div className="glass-card p-8 text-center max-w-md w-full mx-auto">
      {isLoading && (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <h3 className="text-xl font-bold text-white font-syne">Verifying Email</h3>
          <p className="text-gray-400 text-sm">
            Please wait while we verify your email address...
          </p>
        </div>
      )}

      {!isLoading && isSuccess && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white font-syne">Verification Successful!</h3>
          <p className="text-gray-400 text-sm">
            Your email has been verified. Redirecting you to login page...
          </p>
          <Link href="/auth/login" className="btn-primary w-full justify-center mt-4">
            Go to Login Now
          </Link>
        </div>
      )}

      {!isLoading && error && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white font-syne">Verification Failed</h3>
          <p className="text-red-400 text-sm">{error}</p>
          <div className="flex flex-col gap-2 mt-4">
            <Link href="/auth/register" className="btn-primary w-full justify-center">
              Back to Register
            </Link>
            <Link href="/auth/login" className="btn-secondary w-full justify-center text-sm">
              Go to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-space flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-white font-syne tracking-tight">
            <Mail className="w-8 h-8 text-indigo-500" />
            CROWD<span className="text-indigo-400">CARRY</span>
          </Link>
        </div>
        <Suspense fallback={
          <div className="glass-card p-8 text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <p className="text-gray-400 text-sm mt-4">Loading verification...</p>
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </main>
  );
}
