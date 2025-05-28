import { FirebaseOptions } from 'firebase/app';

// Ensure environment variables are prefixed with NEXT_PUBLIC_ for client-side access
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Basic validation to check if essential variables are present
// The 'auth/invalid-api-key' error almost always means the NEXT_PUBLIC_FIREBASE_API_KEY is missing or incorrect.
if (!firebaseConfig.apiKey) {
    console.error(
        'CRITICAL Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or invalid in your environment variables (.env.local or system environment). Firebase cannot initialize.'
    );
    // Throwing an error here might be preferable in production to prevent unexpected behavior.
    // throw new Error('Firebase API Key is missing. Check environment variables.');
} else {
    console.log("Firebase API Key loaded successfully."); // Add confirmation log
}

if (!firebaseConfig.projectId) {
     console.error(
        'CRITICAL Firebase Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or invalid in your environment variables (.env.local or system environment). Firebase cannot initialize.'
    );
} else {
    console.log("Firebase Project ID loaded successfully."); // Add confirmation log
}
// Add more checks for other essential variables if needed (authDomain, etc.)
if (!firebaseConfig.authDomain) {
    console.warn('Firebase Warning: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN might be missing.');
}

export { firebaseConfig };
