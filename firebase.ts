
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase Anda yang telah diperbarui
const firebaseConfig = {
  apiKey: "AIzaSyBvkq7yn3Z8b_Jd2YdTAgrz9CAmhNTbGKM",
  authDomain: "kehadiran-guru-di-kelas.firebaseapp.com",
  projectId: "kehadiran-guru-di-kelas",
  storageBucket: "kehadiran-guru-di-kelas.firebasestorage.app",
  messagingSenderId: "691580901306",
  appId: "1:691580901306:web:4dd18763ffe5af0dad2f83"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
