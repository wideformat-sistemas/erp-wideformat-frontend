import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD_P8gTLlagJAmyE9x-o12u_gNseLNE1FQ",
    authDomain: "wideformat-erp.firebaseapp.com",
    projectId: "wideformat-erp",
    storageBucket: "wideformat-erp.firebasestorage.app",
    messagingSenderId: "405649677881",
    appId: "1:405649677881:web:ae81de94b181dbe5ebf7e8"
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la Base de Datos para usarla en el Kanban
export const db = getFirestore(app);