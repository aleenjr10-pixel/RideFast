import React from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <DashboardPage /> : <LoginPage />;
}
