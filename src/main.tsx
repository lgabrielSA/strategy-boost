import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Firebase
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDgawCGiT-wsWiNADWh0aj6LGGubzSfFC4",
  authDomain: "metodoshot.firebaseapp.com",
  projectId: "metodoshot",
  storageBucket: "metodoshot.appspot.com",
  messagingSenderId: "416296569989",
  appId: "1:416296569989:web:ed96af0ab69f8c52bfedec"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login.html";
  }
});

createRoot(document.getElementById("root")!).render(<App />);
