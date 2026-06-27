import React from 'react';
import { useAuthStore } from '../store/authStore';
import { AdminDashboard } from './AdminDashboard';
import { OwnerDashboard } from './OwnerDashboard';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'Main Admin') {
    return <AdminDashboard />;
  }

  return <OwnerDashboard />;
};
