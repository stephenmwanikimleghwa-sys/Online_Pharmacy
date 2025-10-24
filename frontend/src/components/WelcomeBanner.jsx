import React from 'react';
import { useAuth } from '../context/AuthContext';

const WelcomeBanner = () => {
  const { user } = useAuth();
  
  if (!user) return null;

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mb-8">
      <h1 className="text-2xl font-bold text-gray-900">
        Good {getTimeOfDay()}, {user.first_name}! 👋
      </h1>
      <p className="mt-2 text-gray-600">
        Welcome back to your {user.role} dashboard. Here's an overview of your recent activity.
      </p>
    </div>
  );
};

export default WelcomeBanner;