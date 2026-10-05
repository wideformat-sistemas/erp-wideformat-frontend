import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// Importamos Google y Microsoft (OAuthProvider)
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

const firebaseConfig = {
    // ... tus credenciales actuales se quedan igual ...
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// INICIALIZAR LA AUTENTICACIÓN
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// NUEVO: Proveedor de Microsoft
export const microsoftProvider = new OAuthProvider('microsoft.com');