import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

apiKey: "AIzaSyB20wycPxrJIBAzKxBPlzszODznKyHjVbs",
  authDomain: "test-af758.firebaseapp.com",
  projectId: "test-af758",
  storageBucket: "test-af758.firebasestorage.app",
  messagingSenderId: "477097409635",
  appId: "1:477097409635:web:acd2b43c2bb836fc17cc56"
};

// Inicjalizacja
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export default app;