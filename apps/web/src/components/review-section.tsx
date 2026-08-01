'use client';

import { useEffect, useState } from 'react';
import { Star, Send } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  customerName: string;
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewSectionProps {
  productId: string;
  transactionStatus?: string | null;
}

export function ReviewSection({ productId, transactionStatus }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    transactionId: '',
    rating: 5,
    comment: '',
    customerName: '',
  });

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);

        const [reviewsRes, statsRes] = await Promise.all([
          fetch(`http://localhost:3001/api/v1/reviews/${productId}?limit=10`),
          fetch(`http://localhost:3001/api/v1/reviews/${productId}/stats`),
        ]);

        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(data.reviews);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.rating || !formData.comment || !formData.customerName || !formData.transactionId) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`http://localhost:3001/api/v1/reviews/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: formData.transactionId,
          rating: formData.rating,
          comment: formData.comment,
          customerName: formData.customerName,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to submit review');
      }

      // Reload reviews
      const data = await response.json();
      setReviews([data, ...reviews]);

      // Reset form
      setFormData({ transactionId: '', rating: 5, comment: '', customerName: '' });
      setShowReviewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Customer Reviews</h2>

      {/* Stats */}
      {stats && (
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Average Rating</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(stats.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Reviews</p>
              <p className="text-3xl font-bold">{stats.totalReviews}</p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
              const percent =
                stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-muted-foreground">{rating}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Review */}
      {transactionStatus === 'confirmed' && (
        <div>
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="flex items-center gap-2 rounded-lg border px-6 py-3 font-medium hover:bg-muted transition-colors"
            >
              <Star className="w-4 h-4" />
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmitReview} className="rounded-lg border bg-muted/30 p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-100 border border-red-200 p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating })}
                      className="p-2"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          rating <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Your name"
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={submitting}
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="block text-sm font-medium mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  placeholder="Your transaction ID"
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                  disabled={submitting}
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium mb-2">Your Review</label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  placeholder="Share your thoughts... (5-1000 characters)"
                  rows={4}
                  className="w-full rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                  disabled={submitting}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  disabled={submitting}
                  className="rounded-lg border px-4 py-2 font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">{review.customerName}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-foreground">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
