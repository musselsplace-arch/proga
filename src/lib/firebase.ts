import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  doc, 
  onSnapshot, 
  setDoc, 
  collection, 
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyAoiV09jkVQqKYmGdY_sHz9sv8YOSet17k",
  authDomain: "studio-228546967-ea0ea.firebaseapp.com",
  projectId: "studio-228546967-ea0ea",
  storageBucket: "studio-228546967-ea0ea.firebasestorage.app",
  messagingSenderId: "893032410382",
  appId: "1:893032410382:web:e859ad816f6b7b044f3b5f"
};

const app = initializeApp(firebaseConfig);

// Initialize with custom database id if necessary or defaults
export const db = getFirestore(app, "ai-studio-851370ac-5a0e-4296-9c68-cc584bb9c201");

export {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc
};
