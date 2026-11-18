import { ref } from 'vue';
import { auth } from '../firebase.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@ogkavarna.cz';
const ENV_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const isAuthenticated = ref(sessionStorage.getItem('isAuthenticated') === 'true');
const authError = ref('');

// Synchronize state with Firebase Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    isAuthenticated.value = true;
    sessionStorage.setItem('isAuthenticated', 'true');
  } else {
    isAuthenticated.value = false;
    sessionStorage.removeItem('isAuthenticated');
  }
});

export function useAuth() {
  const login = async (password) => {
    authError.value = '';

    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      isAuthenticated.value = true;
      sessionStorage.setItem('isAuthenticated', 'true');
      return true;
    } catch (err) {
      // If user does not exist in Firebase Auth yet, try to auto-create it with this password
      if (
        (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') &&
        (!ENV_PASSWORD || password === ENV_PASSWORD)
      ) {
        try {
          await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
          isAuthenticated.value = true;
          sessionStorage.setItem('isAuthenticated', 'true');
          return true;
        } catch (createErr) {
          console.warn('Could not auto-create Firebase user:', createErr);
        }
      }

      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        authError.value = 'Incorrect password. Please try again.';
      } else if (err.code === 'auth/operation-not-allowed') {
        authError.value = 'Email/Password sign-in is not enabled in Firebase Console.';
      } else {
        authError.value = err.message || 'Login failed.';
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      isAuthenticated.value = false;
      sessionStorage.removeItem('isAuthenticated');
    }
  };

  return {
    isAuthenticated,
    authError,
    login,
    logout
  };
}
