import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDkew3FnlCH7B4lYpKI6fzC05k1Y8DLPUI",
  authDomain: "og-kavarna.firebaseapp.com",
  projectId: "og-kavarna",
  storageBucket: "og-kavarna.firebasestorage.app",
  messagingSenderId: "1014194588481",
  appId: "1:1014194588481:web:b08a6f34d5a3c0dab5afc0",
  measurementId: "G-H44GD7X6V9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
