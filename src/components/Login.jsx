import { useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { auth, googleProvider, microsoftProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

const Login = ({ onLogin, users }) => {
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Función unificada para entrar con Google o Microsoft
    const handleLogin = async (provider, providerName) => {
        setIsAuthenticating(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email;

            // Verificamos si el correo está en tu lista de Personal
            const employeeRecord = users.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());

            if (employeeRecord) {
                onLogin(employeeRecord);
            } else {
                auth.signOut();
                setError(`Acceso denegado: El correo ${userEmail} no pertenece al personal autorizado.`);
            }
        } catch (error) {
            console.error(error);
            setError(`Autenticación con ${providerName} cancelada o fallida.`);
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md z-10 flex flex-col items-center">
                <img src="/logo.svg" alt="Wide Format" className="h-16 mb-4 bg-white/5 p-3 rounded-2xl" />
                <h1 className="text-2xl font-black text-white tracking-tight">Torre de Control ERP</h1>
                <p className="text-slate-400 text-sm mt-1 text-center mb-8">Acceso seguro empresarial</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex w-full items-center justify-center gap-2 mb-6">
                        <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-left">{error}</span>
                    </div>
                )}

                <div className="w-full space-y-4">
                    <button onClick={() => handleLogin(googleProvider, 'Google')} disabled={isAuthenticating} className="w-full bg-white hover:bg-slate-100 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                        {isAuthenticating ? (
                            <div className="w-5 h-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
                        )}
                        <span>Continuar con Google</span>
                    </button>

                    <button onClick={() => handleLogin(microsoftProvider, 'Microsoft')} disabled={isAuthenticating} className="w-full bg-[#2F2F2F] hover:bg-[#1f1f1f] border border-slate-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70">
                        {isAuthenticating ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 21 21"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
                        )}
                        <span>Continuar con Microsoft</span>
                    </button>
                </div>

                <p className="text-slate-500 text-[10px] mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Protegido por Firebase Auth y 2FA</p>
            </div>
        </div>
    );
};

export default Login;