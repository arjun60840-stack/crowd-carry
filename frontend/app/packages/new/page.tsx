'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { 
  Package, MapPin, Weight, DollarSign, Loader2, 
  ArrowLeft, Calculator, AlertTriangle, Info
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface PackageForm {
  title: string;
  description: string;
  pickupAddress: string;
  pickupCity: string;
  pickupCountry: string;
  destinationAddress: string;
  destinationCity: string;
  destinationCountry: string;
  weight: string;
  size: string;
  category: string;
  urgency: string;
  rewardAmount: string;
  estimatedValue: string;
}

export default function NewPackagePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedPricing, setSuggestedPricing] = useState<any>(null);
  const [images, setImages] = useState<File[]>([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<PackageForm>({
    defaultValues: { size: 'MEDIUM', category: 'OTHER', urgency: 'STANDARD', rewardAmount: '25' }
  });

  const onSubmit = async (data: PackageForm) => {
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      images.forEach(img => formData.append('images', img));

      const res = await api.createPackage(formData);
      if (res.success) {
        router.push(`/packages/${res.data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create package');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/packages" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black font-syne text-white">Post a Package</h1>
          <p className="text-gray-400 mt-1">Describe what you need delivered</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Package Details
          </h2>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Package Title *</label>
            <input
              {...register('title', { required: 'Title is required' })}
              placeholder="e.g., Important Documents, Birthday Gift"
              className="input-field"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Description</label>
            <textarea
              {...register('description')}
              placeholder="Any important details about the package..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Category *</label>
              <select {...register('category')} className="input-field">
                <option value="DOCUMENTS">Documents</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="CLOTHING">Clothing</option>
                <option value="FOOD">Food</option>
                <option value="MEDICINE">Medicine</option>
                <option value="BOOKS">Books</option>
                <option value="ACCESSORIES">Accessories</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Size *</label>
              <select {...register('size')} className="input-field">
                <option value="SMALL">Small (&lt;30cm)</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
                <option value="EXTRA_LARGE">Extra Large</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Urgency *</label>
              <select {...register('urgency')} className="input-field">
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Weight (kg) *</label>
              <input
                {...register('weight', { 
                  required: 'Weight required', 
                  validate: {
                    isNumber: v => !isNaN(Number(v)) || 'Must be a valid number',
                    min: v => Number(v) >= 0.01 || 'Min 0.01kg'
                  }
                })}
                type="text"
                inputMode="decimal"
                placeholder="0.5"
                className="input-field"
              />
              {errors.weight && <p className="text-red-400 text-xs mt-1">{errors.weight.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Estimated Value (₹)</label>
              <input
                {...register('estimatedValue', {
                  validate: {
                    isNumber: v => !v || !isNaN(Number(v)) || 'Must be a valid number',
                    min: v => !v || Number(v) >= 0 || 'Must be positive'
                  }
                })}
                type="text"
                inputMode="numeric"
                placeholder="100"
                className="input-field"
              />
              {errors.estimatedValue && <p className="text-red-400 text-xs mt-1">{errors.estimatedValue.message}</p>}
            </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            Pickup Location
          </h2>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Pickup Address *</label>
            <input {...register('pickupAddress', { required: true })} placeholder="Street address" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">City *</label>
              <input {...register('pickupCity', { required: 'City required' })} placeholder="New York" className="input-field" />
              {errors.pickupCity && <p className="text-red-400 text-xs mt-1">{errors.pickupCity.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Country</label>
              <input {...register('pickupCountry')} placeholder="USA" className="input-field" />
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-400" />
            Destination
          </h2>
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Destination Address *</label>
            <input {...register('destinationAddress', { required: true })} placeholder="Street address" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">City *</label>
              <input {...register('destinationCity', { required: 'City required' })} placeholder="Los Angeles" className="input-field" />
              {errors.destinationCity && <p className="text-red-400 text-xs mt-1">{errors.destinationCity.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Country</label>
              <input {...register('destinationCountry')} placeholder="USA" className="input-field" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Reward Amount
          </h2>

          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-300">
              Our AI Pricing Engine suggests fair rewards based on distance, weight, and urgency. 
              You can adjust the amount — higher rewards attract more carriers!
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Your Reward Offer (₹) *</label>
            <input
              {...register('rewardAmount', { 
                required: 'Reward required',
                validate: {
                  isNumber: v => !isNaN(Number(v)) || 'Must be a valid number',
                  min: v => Number(v) >= 1 || 'Min ₹1'
                }
              })}
              type="text"
              inputMode="decimal"
              placeholder="25"
              className="input-field"
            />
            {errors.rewardAmount && <p className="text-red-400 text-xs mt-1">{errors.rewardAmount.message}</p>}
          </div>
        </div>

        {/* Images */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne">Package Photos (Optional)</h2>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
            <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">Upload photos of your package (max 5)</p>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setImages(Array.from(e.target.files || []).slice(0, 5))}
              className="hidden"
              id="pkg-images"
            />
            <label htmlFor="pkg-images" className="btn-secondary text-sm px-4 py-2 cursor-pointer">
              Choose Files
            </label>
            {images.length > 0 && (
              <p className="text-xs text-indigo-400 mt-2">{images.length} file(s) selected</p>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/packages" className="btn-secondary flex-1 justify-center py-3.5">
            Cancel
          </Link>
          <button type="submit" disabled={isLoading} className="btn-primary flex-1 py-3.5 text-base">
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</> : 'Post Package'}
          </button>
        </div>
      </form>
    </div>
  );
}
