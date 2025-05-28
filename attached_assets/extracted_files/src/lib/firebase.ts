
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
// Import necessary Firestore functions
import {
    getFirestore,
    collection,
    collectionGroup,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    query,
    orderBy, // Ensure orderBy is imported
    limit,
    where,
    getDocs,
    type Firestore // Import Firestore type explicitly
} from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig"; // Import centralized config

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
    console.log("Firebase Module: Attempting Firebase initialization...");
    if (!getApps().length) {
        console.log("Firebase Module: No existing apps found, initializing new app...");
        app = initializeApp(firebaseConfig);
        console.log("Firebase Module: New app initialized successfully.");
    } else {
        console.log("Firebase Module: Existing app found, getting instance.");
        app = getApp();
    }

    auth = getAuth(app);
    console.log("Firebase Module: Auth instance obtained.");
    db = getFirestore(app);
    console.log("Firebase Module: Firestore instance obtained.");

} catch (error: any) {
    console.error("CRITICAL: Firebase initialization failed.", {
        code: error.code,
        message: error.message,
        stack: error.stack // Log stack trace for more details
    });
    // Log specific error messages based on common codes
    if (error.code === 'auth/invalid-api-key') {
        console.error("Detailed Error: Invalid or missing Firebase API Key. Check your NEXT_PUBLIC_FIREBASE_API_KEY environment variable.");
    } else if (error.code === 'auth/internal-error') {
         console.error("Detailed Error: Firebase internal error during initialization. Check network or Firebase status.");
    }
    // Prevent the app from crashing if initialization fails, but it won't function correctly.
    // Consider throwing the error in production to halt execution if Firebase is essential.
    // throw error; // Uncomment to halt execution on error
}

// Function to map email to lojaId (centralized logic)
// Updated to handle admin user explicitly
export const getLojaIdFromEmail = (email: string | null | undefined): string | null => {
    if (!email) {
         console.warn("getLojaIdFromEmail: Called with null or undefined email.");
         return null;
    }
    // Handle specific user UIDs if email mapping isn't sufficient or reliable
    // Example: if (uid === ADMIN_UID) return 'admin';

    if (email === "topguapiara@hotmail.com") return "guapiara";
    if (email === "topribeiraobranco@hotmail.com") return "ribeirao";
    if (email === "topcapaobonito@hotmail.com") return "capao";
    // Explicitly handle admin email if needed, though UID check is generally better
    if (email === "adm@topvistorias.com") return "admin"; // Example admin email

    console.warn(`getLojaIdFromEmail: Email ${email} not mapped to a known lojaId.`);
    return null; // Return null for unmapped emails
};

// Export Firebase app, auth, db instance, and Firestore functions
export {
    app,
    auth,
    db,
    collection,
    collectionGroup,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    Timestamp,
    query,
    orderBy, // Ensure orderBy is exported
    limit,
    where,
    getDocs,
    type Firestore // Export Firestore type
};

    