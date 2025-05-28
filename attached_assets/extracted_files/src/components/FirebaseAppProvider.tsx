'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebaseConfig'; // Use centralized config

interface FirebaseAppContextType {
  app: FirebaseApp | null;
}

const FirebaseAppContext = createContext<FirebaseAppContextType>({ app: null });

export const useFirebaseApp = () => useContext(FirebaseAppContext);

interface FirebaseAppProviderProps {
  children: React.ReactNode;
}

export const FirebaseAppProvider: React.FC<FirebaseAppProviderProps> = ({ children }) => {
  const [app, setApp] = useState<FirebaseApp | null>(null);

  useEffect(() => {
    // Initialize Firebase only on the client side and only once
    if (typeof window !== 'undefined' && !getApps().length) {
      try {
        console.log("FirebaseAppProvider: Initializing Firebase...");
        const initializedApp = initializeApp(firebaseConfig);
        setApp(initializedApp);
        console.log("FirebaseAppProvider: Firebase initialized successfully.");
      } catch (error) {
        console.error("FirebaseAppProvider: Firebase initialization error:", error);
        // Handle initialization error (e.g., show an error message)
      }
    } else if (getApps().length > 0) {
      // If already initialized, get the existing app instance
      console.log("FirebaseAppProvider: Firebase already initialized, getting instance.");
      setApp(getApps()[0]);
    }
  }, []);

  return (
    <FirebaseAppContext.Provider value={{ app }}>
      {children}
    </FirebaseAppContext.Provider>
  );
};
