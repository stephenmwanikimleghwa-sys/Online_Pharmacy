import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const ReviewForm = ({ productId, onReviewSubmitted }) => {
  const { notify } = useNotification();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuth(); // Get JWT token from context

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      notify.warning('Comment Required', 'Please add a comment for your review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(
        '/api/reviews/',
        {
          product: productId,
          rating,
          comment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setComment('');
      setRating(5);
      onReviewSubmitted(response.data); // Callback to refresh reviews
      notify.success('Review Submitted', 'Thank you for your feedback.');
    } catch (error) {
      notify.error('Submit Failed', 'Your review could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 glass-card ">
      <h3 className="text-lg font-semibold mb-4">Add Your Review</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Rating (1-5):</label>
        <select
          value={rating}
          onChange={(e) => setRating(parseInt(e.target.value))}
          className="w-full p-2 border rounded-md"
          required
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <option key={star} value={star}>
              {star} Star{star > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Comment:</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full p-2 border rounded-md resize-none"
          placeholder="Share your experience with this product..."
          required
          maxLength={500}
        />
        <p className="text-sm text-gray-500 mt-1">{comment.length}/500</p>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full btn-primary text-white py-2 px-4 rounded-md  disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
};

export default ReviewForm;
