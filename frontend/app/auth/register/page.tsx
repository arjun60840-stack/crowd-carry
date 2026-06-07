'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Package, Loader2, User, Briefcase } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  role: string;
}

function RegisterPageContent() {
  const { register: registerUser, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultRole = searchParams.get('role') || 'USER';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: { role: defaultRole }
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated]);

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black font-syne gradient-text">Crowd Carry</span>
          </Link>

          <h2 className="text-4xl font-black font-syne text-white mb-4">
            Join the Future<br />of Logistics
          </h2>
          <p className="text-gray-400 text-lg mb-12 leading-relaxed">
            Connect with travelers heading your way and ship smarter, cheaper, and greener.
          </p>

          <div className="space-y-4">
            {[
              { emoji: '🚀', text: 'AI-powered matching in seconds' },
              { emoji: '💰', text: 'Save up to 80% on delivery costs' },
              { emoji: '🌍', text: 'Reduce your carbon footprint' },
              { emoji: '🛡️', text: 'Verified travelers, secure deliveries' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-gray-300">
                <span className="text-xl">{item.emoji}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
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

          <h1 className="text-3xl font-black font-syne text-white mb-2">Create Account</h1>
          <p className="text-gray-400 mb-8">Join thousands of users shipping smarter</p>

          {/* Role Selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: 'USER', label: 'Send Packages', icon: Package, desc: 'I need to ship' },
              { value: 'TRAVELER', label: 'Carry Packages', icon: Briefcase, desc: 'I travel often' },
            ].map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => setValue('role', role.value)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  selectedRole === role.value
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <role.icon className={`w-5 h-5 mb-2 ${selectedRole === role.value ? 'text-indigo-400' : 'text-gray-500'}`} />
                <div className="text-sm font-semibold">{role.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{role.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  {...register('firstName', { required: 'First name required' })}
                  placeholder="First Name"
                  className="input-field"
                />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <input
                  {...register('lastName', { required: 'Last name required' })}
                  placeholder="Last Name"
                  className="input-field"
                />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

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

            <div>
              <input
                {...register('phone')}
                type="tel"
                placeholder="Phone Number (optional)"
                className="input-field"
              />
            </div>

            <div className="relative">
              <input
                {...register('password', {
                  required: 'Password required',
                  minLength: { value: 8, message: 'Min 8 characters' }
                })}
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

            <div>
              <input
                {...register('confirmPassword', { required: 'Please confirm password' })}
                type="password"
                placeholder="Confirm Password"
                className="input-field"
              />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
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
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
