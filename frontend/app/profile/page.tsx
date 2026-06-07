'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Camera, Loader2, CheckCircle, Star, Shield, 
  Package, Plane, Award, TrendingUp, Edit2, Save, X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import DashboardLayout from '@/app/dashboard/layout';
import { format } from 'date-fns';

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    city: user?.city || '',
    country: user?.country || '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) router.push('/auth/login');
    if (user) {
      setForm({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        bio: user.bio || '',
        city: user.city || '',
        country: user.country || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      setIsEditing(false);
    } catch { } finally { setIsSaving(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await api.uploadAvatar(file);
      await refreshUser();
    } catch { } finally { setIsUploading(false); }
  };

  if (!user) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  const trustColor = user.trustScore >= 80 ? 'text-emerald-400' : user.trustScore >= 60 ? 'text-blue-400' : 'text-yellow-400';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black font-syne text-white">My Profile</h1>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="btn-secondary text-sm px-4 py-2 gap-2">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="btn-secondary text-sm px-4 py-2 gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} className="btn-primary text-sm px-4 py-2 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar & Badges */}
        <div className="space-y-4">
          <div className="glass-card p-6 text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-black mx-auto overflow-hidden">
                {user.avatar ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL}${user.avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user.firstName[0]}{user.lastName[0]}</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </div>

            <div className="mt-4">
              <h2 className="text-xl font-bold font-syne">{user.firstName} {user.lastName}</h2>
              <div className="text-sm text-gray-400 mt-0.5">{user.role}</div>
              {user.city && <div className="text-xs text-gray-500 mt-1">{user.city}{user.country ? `, ${user.country}` : ''}</div>}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(user.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`} />
              ))}
              <span className="text-sm text-gray-400 ml-1">{user.rating.toFixed(1)} ({user.totalRatings})</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {user.isTrustedTraveler && <span className="badge-trusted">🛡️ Trusted</span>}
              {user.isVerifiedBadge && <span className="badge-verified">✅ Verified</span>}
              {user.isTopCarrier && <span className="badge-top">🏆 Top Carrier</span>}
            </div>
          </div>

          {/* Trust Score */}
          <div className="glass-card p-6">
            <div className="text-xs text-gray-500 mb-3">TRUST SCORE</div>
            <div className={`text-4xl font-black font-syne ${trustColor}`}>
              {user.trustScore.toFixed(0)}
              <span className="text-sm text-gray-500 font-normal">/100</span>
            </div>
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${user.trustScore >= 80 ? 'bg-emerald-500' : user.trustScore >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                style={{ width: `${user.trustScore}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                {user.isEmailVerified ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-gray-600" />}
                Email Verified
              </div>
              <div className="flex items-center gap-1">
                {user.isPhoneVerified ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-gray-600" />}
                Phone Verified
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card p-6 grid grid-cols-2 gap-4">
            {[
              { label: 'Deliveries', value: user.completedDeliveries, icon: Package, color: 'text-indigo-400' },
              { label: 'Total Trips', value: user.totalTrips, icon: Plane, color: 'text-purple-400' },
              { label: 'Success Rate', value: `${Math.round(user.successRate * 100)}%`, icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Member Since', value: format(new Date(user.createdAt), 'MMM yyyy'), icon: Award, color: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                <div className="font-bold text-white">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-bold font-syne">Personal Information</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">First Name</label>
                {isEditing ? (
                  <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="input-field" />
                ) : (
                  <div className="text-white">{user.firstName}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Last Name</label>
                {isEditing ? (
                  <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="input-field" />
                ) : (
                  <div className="text-white">{user.lastName}</div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Email</label>
              <div className="text-white flex items-center gap-2">
                {user.email}
                {user.isEmailVerified && <CheckCircle className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Phone</label>
              {isEditing ? (
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+1234567890" />
              ) : (
                <div className="text-white flex items-center gap-2">
                  {user.phone || <span className="text-gray-600">Not set</span>}
                  {user.isPhoneVerified && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">City</label>
                {isEditing ? (
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field" />
                ) : (
                  <div className="text-white">{user.city || <span className="text-gray-600">Not set</span>}</div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Country</label>
                {isEditing ? (
                  <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} className="input-field" />
                ) : (
                  <div className="text-white">{user.country || <span className="text-gray-600">Not set</span>}</div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Bio</label>
              {isEditing ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="input-field resize-none"
                  placeholder="Tell others about yourself..."
                />
              ) : (
                <div className="text-white text-sm">{user.bio || <span className="text-gray-600">No bio yet</span>}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <ProfileContent />
    </DashboardLayout>
  );
}
