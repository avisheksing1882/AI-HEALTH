import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyAR6RO_wLinJKa00zuiz7Y7g0_fVeGcNrc',
  authDomain: 'vitaltrack-ai-74895.firebaseapp.com',
  projectId: 'vitaltrack-ai-74895',
  storageBucket: 'vitaltrack-ai-74895.firebasestorage.app',
  messagingSenderId: '693995618601',
  appId: '1:693995618601:web:8d2be58b61574c9e297738',
  measurementId: 'G-V6CHWPYNRE'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const firestore = getFirestore(app);

// Enable offline persistence (IndexedDB-backed cache for Firestore)
enableIndexedDbPersistence(firestore).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('[Firebase] Persistence failed: Multiple tabs open. Only one tab can use offline persistence at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('[Firebase] Persistence not available in this browser.');
  }
});

export default app;
