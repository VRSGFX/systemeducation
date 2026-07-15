// src/lib/firebase.ts
// Firebase is used ONLY for Authentication in this project.
// All application data (profiles, attendance, grades, announcements, events)
// lives in Supabase — see src/lib/supabase.ts

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Prevent re-initialization during HMR
export const firebaseApp: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

/**
 * EduTrack logs users in with NISN/NIP instead of email.
 * Firebase Auth requires an email, so we derive a stable synthetic
 * email from the NISN/NIP: "<nisn>@edutrack.local".
 * This email is never shown to the user and is never emailed to.
 */
export function nisnToSyntheticEmail(nisn: string): string {
  const clean = nisn.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean}@edutrack.local`;
}
