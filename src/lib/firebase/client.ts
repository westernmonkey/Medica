// Import the functions you need from the Firebase SDK
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// This is the configuration object that reads the keys from your .env.local file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase for your app
// The logic here prevents the app from being initialized more than once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Get the specific Firebase services we will use
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services so we can use them in other parts of our application
export { app, auth, db };