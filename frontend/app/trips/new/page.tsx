'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Plane, MapPin, Weight, Loader2, ArrowLeft, Calendar, Clock, Info } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface TripForm {
  sourceCity: string;
  sourceCountry: string;
  destinationCity: string;
  destinationCountry: string;
  travelDate: string;
  travelTime: string;
  vehicleType: string;
  availableWeight: string;
  availableCapacity: string;
  pricePerKg: string;
  notes: string;
}

export default function NewTripPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<TripForm>({
    defaultValues: { vehicleType: 'CAR', availableWeight: '10', availableCapacity: '20' }
  });

  const onSubmit = async (data: TripForm) => {
    setIsLoading(true);
    setError('');
    try {
      const res: any = await api.createTrip({
        ...data,
        availableWeight: parseFloat(data.availableWeight),
        availableCapacity: parseFloat(data.availableCapacity),
        pricePerKg: data.pricePerKg ? parseFloat(data.pricePerKg) : undefined,
      });
      if (res.success) router.push(`/trips/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/trips" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-black font-syne text-white">Post a Trip</h1>
          <p className="text-gray-400 mt-1">Let senders know you can carry packages</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-300">
          Our AI engine will automatically match your trip with packages that need delivery along your route. 
          The more details you provide, the better the matches!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Route */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            Your Route
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">From City *</label>
              <input
                {...register('sourceCity', { required: 'Source city required' })}
                placeholder="New York"
                className="input-field"
              />
              {errors.sourceCity && <p className="text-red-400 text-xs mt-1">{errors.sourceCity.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">From Country</label>
              <input {...register('sourceCountry')} placeholder="USA" className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">To City *</label>
              <input
                {...register('destinationCity', { required: 'Destination city required' })}
                placeholder="Los Angeles"
                className="input-field"
              />
              {errors.destinationCity && <p className="text-red-400 text-xs mt-1">{errors.destinationCity.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">To Country</label>
              <input {...register('destinationCountry')} placeholder="USA" className="input-field" />
            </div>
          </div>
        </div>

        {/* Travel Details */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Travel Details
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Travel Date *</label>
              <input
                {...register('travelDate', { required: 'Travel date required' })}
                type="date"
                min={minDate}
                className="input-field"
              />
              {errors.travelDate && <p className="text-red-400 text-xs mt-1">{errors.travelDate.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Departure Time</label>
              <input {...register('travelTime')} type="time" className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Vehicle Type *</label>
            <select {...register('vehicleType')} className="input-field">
              <option value="CAR">🚗 Car</option>
              <option value="FLIGHT">✈️ Flight</option>
              <option value="TRAIN">🚂 Train</option>
              <option value="MOTORCYCLE">🏍️ Motorcycle</option>
              <option value="BICYCLE">🚲 Bicycle</option>
              <option value="PUBLIC_TRANSPORT">🚌 Public Transport</option>
              <option value="WALK">🚶 Walking</option>
            </select>
          </div>
        </div>

        {/* Capacity */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold font-syne flex items-center gap-2">
            <Weight className="w-5 h-5 text-cyan-400" />
            Available Capacity
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Max Weight (kg) *</label>
              <input
                {...register('availableWeight', { required: true, min: { value: 0.1, message: 'Min 0.1kg' } })}
                type="number"
                step="0.5"
                placeholder="10"
                className="input-field"
              />
              {errors.availableWeight && <p className="text-red-400 text-xs mt-1">{errors.availableWeight.message}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Volume (liters)</label>
              <input
                {...register('availableCapacity', { required: true })}
                type="number"
                step="1"
                placeholder="20"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Price per kg (₹) - optional</label>
            <input
              {...register('pricePerKg')}
              type="number"
              step="0.5"
              placeholder="5.00"
              className="input-field"
            />
            <p className="text-xs text-gray-600 mt-1">Leave empty to let senders propose the reward</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Travel Notes</label>
            <textarea
              {...register('notes')}
              placeholder="Any restrictions? Fragile items OK? Documents only? Let senders know..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/trips" className="btn-secondary flex-1 justify-center py-3.5">Cancel</Link>
          <button type="submit" disabled={isLoading} className="btn-primary flex-1 py-3.5 text-base">
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</> : 'Post Trip'}
          </button>
        </div>
      </form>
    </div>
  );
}
