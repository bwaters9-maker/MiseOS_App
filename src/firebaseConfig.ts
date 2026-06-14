import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgumKqhSUhmOLWM0g5rGRpaARBQGBU4WQ",
  authDomain: "miseos-app.firebaseapp.com",
  projectId: "miseos-app",
  storageBucket: "miseos-app.firebasestorage.app",
  messagingSenderId: "1023982146747",
  appId: "1:1023982146747:web:9612f60c9da00eb55a059e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
