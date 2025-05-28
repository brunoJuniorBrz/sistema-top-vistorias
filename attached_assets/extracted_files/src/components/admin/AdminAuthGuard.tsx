
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import Navbar from '@/components/navbar'; // Optional: Include Navbar in loading state

interface AdminAuthGuardProps {
  children: React.ReactNode;
  adminUid: string; // Pass the required Admin UID
}

const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children, adminUid }) => {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);

  React.useEffect(() => {
    console.log("AdminAuthGuard: Setting up auth listener.");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log(`AdminAuthGuard: Auth state changed. Current user UID: ${currentUser?.uid}`);
      setUser(currentUser); // Update user state regardless

      if (currentUser) {
        console.log(`AdminAuthGuard: User found (UID: ${currentUser.uid}). Checking authorization...`);
        if (currentUser.uid === adminUid) {
          console.log("AdminAuthGuard: User is authorized admin.");
          setIsAuthorized(true);
        } else {
          console.log("AdminAuthGuard: User is not authorized admin. Redirecting to home.");
          setIsAuthorized(false);
          router.push('/'); // Redirect non-admin users immediately
        }
      } else {
        console.log("AdminAuthGuard: No user found. Redirecting to login.");
        setIsAuthorized(false);
        router.push('/login'); // Redirect unauthenticated users immediately
      }
      // Set loading to false after the check is done and potential redirects are initiated
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
        console.log("AdminAuthGuard: Unsubscribing auth listener.");
        unsubscribe();
    }
  }, [router, adminUid]); // Rerun effect if router or adminUid changes

  if (loading) {
    // Show a loading skeleton while checking authentication and authorization
    console.log("AdminAuthGuard: Rendering Loading Skeleton.");
    return (
       <div className="flex flex-col min-h-screen">
         <Navbar user={null} /> {/* Or a Skeleton Navbar */}
         <main className="flex-grow container mx-auto px-4 md:px-8 py-8">
             <Skeleton className="h-10 w-1/3 mb-8" />
             <Skeleton className="h-64 w-full" />
         </main>
      </div>
    );
  }

   // If loading is complete, but the user is not authorized (or null), render null.
   // The redirection logic in useEffect has already been triggered.
   if (!isAuthorized) {
      console.log("AdminAuthGuard: Rendering null (unauthorized or redirecting).");
      return null;
   }

   // If loading is complete and the user is authorized, render the protected children.
   console.log("AdminAuthGuard: Rendering authorized children.");
  return <>{children}</>;
};

export default AdminAuthGuard;

    