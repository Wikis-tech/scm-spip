import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Automatically loads credentials from the generated configuration
const firebaseConfig = {
  apiKey: "AIzaSyAz94cqY9IvFXLzuH3_JsQIh_zIiRimu5M",
  authDomain: "persuasive-rush-l7854.firebaseapp.com",
  projectId: "persuasive-rush-l7854",
  storageBucket: "persuasive-rush-l7854.firebasestorage.app",
  messagingSenderId: "983924830854",
  appId: "1:983924830854:web:d48ff6e56423649bbbd707"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Sign-In Provider with required Workspace scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/gmail.modify");
googleProvider.addScope("https://www.googleapis.com/auth/gmail.send");
googleProvider.addScope("https://www.googleapis.com/auth/calendar");

export { signInWithPopup, signOut };
