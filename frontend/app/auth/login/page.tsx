'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Package, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (type: 'admin' | 'traveler' | 'user') => {
    const demos = {
      admin: { email: 'admin@crowdcarry.com', password: 'Admin@123' },
      traveler: { email: 'john.traveler@example.com', password: 'Demo@123' },
      user: { email: 'alice.sender@example.com', password: 'Demo@123' },
    };
    return demos[type];
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
            Welcome Back!
          </h2>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            Sign in to manage your packages, find matches, and track deliveries in real-time.
          </p>

          <div className="glass-card p-6">
            <div className="text-sm text-gray-400 mb-4 font-medium">Demo Accounts</div>
            <div className="space-y-2">
              {[
                { type: 'admin' as const, label: '🔑 Admin', email: 'admin@crowdcarry.com' },
                { type: 'traveler' as const, label: '✈️ Traveler', email: 'john.traveler@example.com' },
                { type: 'user' as const, label: '📦 Sender', email: 'alice.sender@example.com' },
              ].map((demo) => (
                <div key={demo.type} className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{demo.label}</span>
                  <span className="text-gray-600">—</span>
                  <span className="font-mono">{demo.email}</span>
                </div>
              ))}
              <div className="text-xs text-gray-600 mt-2">Password: Demo@123 / Admin@123</div>
            </div>
          </div>
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

          <h1 className="text-3xl font-black font-syne text-white mb-2">Sign In</h1>
          <p className="text-gray-400 mb-8">Welcome back to Crowd Carry</p>

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

            <div className="relative">
              <input
                {...register('password', { required: 'Password required' })}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="input-field pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300">
                Forgot password?
              </Link>
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
                <><Loader2 className="w-5 h-5 animate-spin" /> Signing In...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
