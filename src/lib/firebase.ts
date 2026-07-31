import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDuEPDV2wpBtgfSW6L4v05PVUxeaFkW3k0",
  authDomain: "plot-9fd6e.firebaseapp.com",
  projectId: "plot-9fd6e",
  storageBucket: "plot-9fd6e.firebasestorage.app",
  messagingSenderId: "1037620305589",
  appId: "1:1037620305589:web:af0047b9a1b65ec5b068fc",
  measurementId: "G-WPNH7458SC"
};

const app  = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export const auth      = getAuth(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app);
