'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Package, Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { password: '', confirmPassword: '' }
  });

  const password = watch('password');

  const onSubmit = async (data: any) => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.resetPassword(token, data.password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="glass-card p-6 mt-8 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 font-syne">Password Reset!</h3>
        <p className="text-gray-400 text-sm mb-6">
          Your password has been successfully updated. Redirecting you to login...
        </p>
        <Link href="/auth/login" className="btn-primary w-full justify-center">
          Go to Login Now
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="glass-card p-6 mt-8 text-center">
        <p className="text-red-400 text-sm mb-6">
          Missing reset token. Please use the exact link provided in your email.
        </p>
        <Link href="/auth/forgot-password" className="btn-primary w-full justify-center">
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="relative">
        <input
          {...register('password', { 
            required: 'Password required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' }
          })}
          type={showPassword ? 'text' : 'password'}
          placeholder="New Password"
          className="input-field pr-12"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password?.message?.toString()}</p>}
      </div>

      <div className="relative">
        <input
          {...register('confirmPassword', { 
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm New Password"
          className="input-field pr-12"
        />
        {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword?.message?.toString()}</p>}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3.5 text-base"
      >
        {isLoading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Resetting...</>
        ) : (
          'Reset Password'
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black font-syne gradient-text">Crowd Carry</span>
          </Link>

          <h2 className="text-4xl font-black font-syne text-white mb-4">
            Create New Password
          </h2>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            Almost there! Create a strong, unique password to secure your Crowd Carry account.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black font-syne gradient-text">Crowd Carry</span>
            </Link>
          </div>

          <h1 className="text-3xl font-black font-syne text-white mb-2">New Password</h1>
          <p className="text-gray-400 mb-8">Enter your new password below.</p>

          <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
