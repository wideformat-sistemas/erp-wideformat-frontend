import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD_P8gTLlagJAmyE9x-o12u_gNseLNE1FQ",
    authDomain: "wideformat-erp.firebaseapp.com",
    projectId: "wideformat-erp",
    storageBucket: "wideformat-erp.firebasestorage.app",
    messagingSenderId: "405649677881",
    appId: "1:405649677881:web:ae81de94b181dbe5ebf7e8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Inicializar Autenticación y Proveedores
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');