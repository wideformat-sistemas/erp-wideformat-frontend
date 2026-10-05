import { useState } from 'react';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ onLogin, users }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            // 1. Firebase verifica el correo y la contraseña encriptada de forma segura
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userEmail = userCredential.user.email;

            // 2. Buscamos ese correo en tu módulo de personal para saber qué Rol tiene
            const employeeRecord = users.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());

            if (employeeRecord) {
                onLogin(employeeRecord); // Acceso concedido
            } else {
                // Si la contraseña es correcta pero no está en tu lista de empleados
                auth.signOut();
                setError(`El correo ${userEmail} no está registrado en el personal de la planta.`);
            }
        } catch (error) {
            console.error("Error de Firebase:", error.code);
            // Manejo de errores amigable
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setError('Correo o contraseña incorrectos.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Demasiados intentos fallidos. Cuenta bloqueada temporalmente.');
            } else {
                setError('Error al intentar iniciar sesión. Revise su conexión.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.svg" alt="Wide Format" className="h-16 mb-4 bg-white/5 p-3 rounded-2xl" />
                    <h1 className="text-2xl font-black text-white tracking-tight">Torre de Control ERP</h1>
                    <p className="text-slate-400 text-sm mt-1">Acceso con credenciales encriptadas</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                            <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-left">{error}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Correo Electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-500" /></div>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="ejemplo@empresa.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-500" /></div>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="••••••••" />
                        </div>
                    </div>

                    <button type="submit" disabled={isAuthenticating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 mt-4">
                        {isAuthenticating ? (
                            <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Verificando...</>
                        ) : (
                            <><ShieldCheck className="w-5 h-5" /> Ingresar al Sistema</>
                        )}
                    </button>

                    <p className="text-slate-500 text-[10px] mt-6 flex justify-center items-center gap-1"><ShieldCheck className="w-3 h-3"/> Seguridad Criptográfica Activa</p>
                </form>
            </div>
        </div>
    );
};

export default Login;