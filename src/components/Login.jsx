import { useState } from 'react';
import { Lock, User, ShieldCheck, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, getMultiFactorResolver, TotpMultiFactorGenerator, updatePassword } from 'firebase/auth';

const Login = ({ onLogin, users = [] }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Estados para el flujo de Doble Factor (2FA)
    const [requiresMfa, setRequiresMfa] = useState(false);
    const [mfaResolver, setMfaResolver] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    // Estados para el cambio obligatorio de contraseña en el primer login
    const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            // 1. Intento de inicio de sesión normal con credenciales temporales o definitivas
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            processSuccessfulLogin(userCredential.user.email);
        } catch (error) {
            console.error("Error de Firebase:", error);

            // 2. Si Firebase detecta que la cuenta exige Doble Factor (2FA)
            if (error.code === 'auth/multi-factor-auth-required') {
                const resolver = getMultiFactorResolver(auth, error);
                setMfaResolver(resolver);
                setRequiresMfa(true);
                setIsAuthenticating(false);
            } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setError('Correo o contraseña incorrectos.');
                setIsAuthenticating(false);
            } else if (error.code === 'auth/too-many-requests') {
                setError('Demasiados intentos fallidos. Cuenta bloqueada temporalmente.');
                setIsAuthenticating(false);
            } else {
                setError(`Error: ${error.message || 'No se pudo iniciar sesión.'}`);
                setIsAuthenticating(false);
            }
        }
    };

    // Validar el código de 6 dígitos de Google o Microsoft Authenticator
    const handleVerifyMfa = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');

        try {
            const hint = mfaResolver.hints[0];
            const cred = TotpMultiFactorGenerator.assertionForSignIn(
                hint.uid,
                verificationCode
            );

            const userCredential = await mfaResolver.resolveSignIn(cred);
            processSuccessfulLogin(userCredential.user.email);
        } catch (error) {
            console.error(error);
            setError('Código de autenticación incorrecto o expirado.');
            setIsAuthenticating(false);
        }
    };

    // Actualizar la contraseña temporal por una nueva y segura
    const handleUpdateTemporaryPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsAuthenticating(true);
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Sesión no encontrada.");

            // Actualizamos la clave en Firebase Auth
            await updatePassword(user, newPassword);

            // Buscamos el registro del empleado para darle acceso al ERP
            const safeUsers = Array.isArray(users) ? users : [];
            const employeeRecord = safeUsers.find(u => u.email && u.email.toLowerCase() === user.email.toLowerCase());

            if (employeeRecord) {
                onLogin(employeeRecord);
            } else {
                auth.signOut();
                setError('El usuario se actualizó pero no se encontró en la lista de personal.');
                setIsAuthenticating(false);
            }
        } catch (err) {
            console.error("Error al actualizar contraseña:", err);
            if (err.code === 'auth/requires-recent-login') {
                setError('Por seguridad, vuelva a iniciar sesión antes de cambiar la clave.');
            } else {
                setError(`No se pudo actualizar la contraseña: ${err.message}`);
            }
            setIsAuthenticating(false);
        }
    };

    const processSuccessfulLogin = (userEmail) => {
        const safeUsers = Array.isArray(users) ? users : [];
        const employeeRecord = safeUsers.find(u => u.email && u.email.toLowerCase() === userEmail.toLowerCase());

        if (employeeRecord) {
            // Verificamos si es un nuevo empleado que debe cambiar su contraseña temporal
            if (employeeRecord.mustChangePassword) {
                setRequiresPasswordChange(true);
                setIsAuthenticating(false);
                return;
            }
            onLogin(employeeRecord);
        } else {
            auth.signOut();
            setError(`El correo ${userEmail} no está registrado en el personal de la planta.`);
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
                    <p className="text-slate-400 text-sm mt-1">
                        {requiresPasswordChange
                            ? 'Cambio Obligatorio de Contraseña'
                            : requiresMfa
                                ? 'Verificación de Dos Pasos (2FA)'
                                : 'Acceso con credenciales corporativas'}
                    </p>
                </div>

                {requiresPasswordChange ? (
                    // VISTA 1: CAMBIO OBLIGATORIO DE CONTRASEÑA TEMPORAL
                    <form onSubmit={handleUpdateTemporaryPassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-left">{error}</span>
                            </div>
                        )}

                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl text-center">
                            <p className="text-xs text-amber-300 font-medium">
                                Es tu primer inicio de sesión con clave temporal. Por seguridad, debes establecer una nueva contraseña definitiva antes de ingresar.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="block w-full px-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Confirmar Nueva Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="block w-full px-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button type="submit" disabled={isAuthenticating} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4">
                            {isAuthenticating ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Actualizando...</>
                            ) : (
                                <><ShieldCheck className="w-5 h-5" /> Establecer Contraseña Definitiva</>
                            )}
                        </button>
                    </form>
                ) : !requiresMfa ? (
                    // VISTA 2: FORMULARIO DE LOGIN NORMAL
                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-left">{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Correo Electrónico</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="ejemplo@empresa.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="block w-full pl-10 pr-12 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isAuthenticating} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-70 mt-4">
                            {isAuthenticating ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Verificando...</>
                            ) : (
                                <><ShieldCheck className="w-5 h-5" /> Ingresar al Sistema</>
                            )}
                        </button>

                        <p className="text-slate-500 text-[10px] mt-6 flex justify-center items-center gap-1"><ShieldCheck className="w-3 h-3"/> Seguridad Criptográfica Activa</p>
                    </form>
                ) : (
                    // VISTA 3: DESAFÍO MFA 2FA (CÓDIGO DE 6 DÍGITOS)
                    <form onSubmit={handleVerifyMfa} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                <AlertCircle className="w-5 h-5 shrink-0" /> <span className="text-left">{error}</span>
                            </div>
                        )}

                        <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-xl text-center">
                            <p className="text-xs text-blue-300">
                                Abra su aplicación de autenticación e ingrese el código de 6 dígitos.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">Código de Verificación</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="text"
                                    maxLength="6"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                    autoFocus
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white text-center text-2xl tracking-widest font-mono placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="000000"
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isAuthenticating || verificationCode.length < 6} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 mt-4">
                            {isAuthenticating ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Validando código...</>
                            ) : (
                                <><ShieldCheck className="w-5 h-5" /> Verificar y Entrar</>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setRequiresMfa(false); setVerificationCode(''); }}
                            className="w-full text-slate-400 hover:text-white text-xs font-semibold py-2 transition-colors"
                        >
                            ← Volver al inicio de sesión
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;