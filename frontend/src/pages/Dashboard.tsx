import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AdminDashboard } from './AdminDashboard';
import { OwnerDashboard } from './OwnerDashboard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Redirect owners to /owner/dashboard if they access /dashboard
    if (user?.role === 'Hostel Owner' && !window.location.pathname.startsWith('/owner/')) {
      navigate('/owner/dashboard', { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === 'Main Admin') {
    return <AdminDashboard />;
  }

  // This will only render if owner hasn't been redirected yet
  return <OwnerDashboard />;
};
