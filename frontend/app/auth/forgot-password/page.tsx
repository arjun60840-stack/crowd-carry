'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Package, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

interface ForgotPasswordForm {
  email: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setError('');
    try {
      await api.forgotPassword(data.email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

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
            Forgot Password?
          </h2>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            Don't worry! Enter your email and we will send you a secure link to reset your password.
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

          <Link href="/auth/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>

          <h1 className="text-3xl font-black font-syne text-white mb-2">Reset Password</h1>
          
          {isSuccess ? (
            <div className="glass-card p-6 mt-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-syne">Check your email</h3>
              <p className="text-gray-400 text-sm mb-6">
                If an account exists with that email address, we have sent instructions to reset your password.
              </p>
              <Link href="/auth/login" className="btn-primary w-full justify-center">
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-400 mb-8">Enter your email address to receive a reset link.</p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <input
                    {...register('email', {
                      required: 'Email required',
                      pattern: { value: /^[^@]+@[^@]+\.[^@]+$/, message: 'Invalid email' }
                    })}
                    type="email"
                    placeholder="Email Address"
                    className="input-field"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
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
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending Link...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
