'use client';

import { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  revieweeId: string;
  packageId?: string;
  revieweeName: string;
  onSuccess?: () => void;
}

export default function ReviewModal({ isOpen, onClose, revieweeId, packageId, revieweeName, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.createReview({
        revieweeId,
        packageId,
        rating,
        comment: comment.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h2 className="text-lg font-bold font-syne text-white">Rate your experience</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-center text-gray-300 mb-6">
            How was your experience with <span className="font-bold text-white">{revieweeName}</span>?
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star 
                  className={`w-10 h-10 ${
                    (hoverRating || rating) >= star 
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-gray-600'
                  } transition-colors`} 
                />
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Leave a comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others what you thought..."
              rows={4}
              className="input-field w-full"
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400 text-center">{error}</div>
          )}

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || rating === 0}
            className="btn-primary w-full justify-center"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Submitting...</>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
