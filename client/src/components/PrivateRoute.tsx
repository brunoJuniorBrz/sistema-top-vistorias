import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
        <main className="flex-grow container mx-auto px-4 md:px-8 py-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Skeleton className="h-40 w-full rounded-xl shadow-md" />
            </div>
            <div className="md:col-span-2">
              <Skeleton className="h-16 w-3/4 mb-4 rounded-lg" />
              <Skeleton className="h-8 w-full mb-6 rounded" />
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
                <Skeleton className="h-20 w-full rounded-xl shadow-sm" />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
} 