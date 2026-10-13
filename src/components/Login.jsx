import { useState } from 'react';
import { Lock, User, ShieldCheck, AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

// --- CONFIGURACIÓN DE LA URL DEL BACKEND ---
// Si existe la variable de entorno en Vercel la usa, de lo contrario usa tu dominio de Bluehost (o localhost para pruebas)
const API_URL = 'https://erp.wideformat.com.ec';
const Login = ({ onLogin }) => {
    // Estados de navegación
    const [step, setStep] = useState('LOGIN'); // 'LOGIN', 'CHANGE_PASSWORD', '2FA'
    const [tempUser, setTempUser] = useState(null); // Guarda los datos temporales del usuario antes del acceso total
// ... (el resto de tu código sigue exactamente igual hacia abajo)

    // Estados de formularios
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaMethod, setTwoFaMethod] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Estados de UI
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // --- 1. PROCESO DE LOGIN INICIAL ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');
        setSuccessMsg('');

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await response.json();

            if (response.ok) {
                // Caso A: Es su primera vez (debe cambiar clave)
                if (data.requirePasswordChange) {
                    setTempUser({ id: data.userId });
                    setStep('CHANGE_PASSWORD');
                }
                // Caso B: Tiene 2FA activado
                else if (data.require2FA) {
                    setTempUser({ id: data.userId });
                    setTwoFaMethod(data.method);
                    setStep('2FA');
                }
                // Caso C: Login normal exitoso
                else {
                    localStorage.setItem('usuario', JSON.stringify(data.usuario));
                    if (typeof onLogin === 'function') onLogin(data.usuario);
                }
            } else {
                setError(data.error || 'Credenciales incorrectas');
            }
        } catch (err) {
            setError(`No se pudo conectar con el servidor. Comprueba la red.`);
        } finally {
            setIsAuthenticating(false);
        }
    };

    // --- 2. PROCESO DE CAMBIO DE CONTRASEÑA OBLIGATORIO ---
    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsAuthenticating(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/cambiar-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: tempUser.id, newPassword })
            });
            const data = await res.json();

            if (res.ok) {
                setStep('LOGIN');
                setPassword('');
                setNewPassword('');
                setSuccessMsg('¡Contraseña actualizada! Por favor, inicia sesión con tu nueva clave.');
            } else {
                setError(data.error || "No se pudo actualizar la contraseña.");
            }
        } catch(err) {
            setError("Error de conexión al guardar la contraseña.");
        }
        setIsAuthenticating(false);
    };

    // --- 3. PROCESO DE VERIFICACIÓN 2FA ---
    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/2fa/verificar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: tempUser.id, codigo: twoFaCode })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                if (typeof onLogin === 'function') onLogin(data.usuario);
            } else {
                setError(data.error || "El código ingresado es incorrecto.");
            }
        } catch(err) {
            setError("Error de conexión al verificar el código.");
        }
        setIsAuthenticating(false);
    };

    // --- RENDERIZADO DE LAS PANTALLAS ---
    return (
        <div className="min-h-screen w-full bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.18),rgba(255,255,255,0))] flex items-center justify-center p-4 sm:p-6 md:p-10 lg:p-12 relative overflow-hidden">
            <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-2xl backdrop-blur-xl relative z-10 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600" />

                <div className="flex flex-col items-center text-center mb-8 md:mb-10">
                    <div className="bg-slate-950 border border-slate-800 p-3.5 md:p-4 rounded-2xl shadow-inner mb-4">
                        <img src="/logo.svg" alt="Wide Format" className="h-12 md:h-14 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Torre de Control ERP
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium">
                        {step === 'LOGIN' && "Acceso seguro con credenciales corporativas"}
                        {step === 'CHANGE_PASSWORD' && "Actualización de seguridad requerida"}
                        {step === '2FA' && "Verificación de seguridad en dos pasos"}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-950/60 border border-red-800/80 p-3.5 rounded-xl text-red-300 text-xs sm:text-sm flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="mb-6 bg-emerald-950/60 border border-emerald-800/80 p-3.5 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* --- PANTALLA 1: LOGIN NORMAL --- */}
                {step === 'LOGIN' && (
                    <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@wideformat.com.ec"
                                    className="w-full pl-12 pr-4 py-3.5 md:py-4 bg-slate-950/90 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-12 pr-12 py-3.5 md:py-4 bg-slate-950/90 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-3.5 md:py-4 rounded-xl text-sm md:text-base shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                        >
                            {isAuthenticating ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</> : <><ShieldCheck className="w-5 h-5" /> Ingresar al Sistema</>}
                        </button>
                    </form>
                )}

                {/* --- PANTALLA 2: CAMBIO DE CONTRASEÑA --- */}
                {step === 'CHANGE_PASSWORD' && (
                    <form onSubmit={handleChangePassword} className="space-y-5 md:space-y-6">
                        <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl mb-4">
                            <p className="text-amber-300 text-sm font-medium">
                                Por políticas de seguridad, debes configurar una nueva contraseña personal antes de acceder al ERP por primera vez.
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                                Crea tu Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Escribe al menos 6 caracteres"
                                    className="w-full pl-12 pr-12 py-3.5 md:py-4 bg-slate-950/90 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-amber-500 transition-colors"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={isAuthenticating} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold py-3.5 md:py-4 rounded-xl text-sm md:text-base shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
                            {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar y Continuar'}
                        </button>
                    </form>
                )}

                {/* --- PANTALLA 3: VERIFICACIÓN 2FA --- */}
                {step === '2FA' && (
                    <form onSubmit={handleVerify2FA} className="space-y-5 md:space-y-6 text-center">
                        <div className="bg-slate-950/60 border border-slate-800 p-5 rounded-xl mb-4">
                            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                            <p className="text-slate-300 text-sm font-medium">
                                {twoFaMethod === 'EMAIL'
                                    ? 'Hemos enviado un código de 6 dígitos a tu correo corporativo.'
                                    : 'Abre Google Authenticator o Authy en tu celular para ver el código.'}
                            </p>
                        </div>
                        <div>
                            <input
                                required
                                type="text"
                                maxLength="6"
                                value={twoFaCode}
                                onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))} // Solo acepta números
                                placeholder="000000"
                                className="w-full py-4 bg-slate-950/90 border border-slate-800 rounded-xl text-2xl tracking-[0.5em] text-center font-mono text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-700"
                            />
                        </div>
                        <button type="submit" disabled={isAuthenticating} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3.5 md:py-4 rounded-xl text-sm md:text-base shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2">
                            {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar Acceso'}
                        </button>
                        <button type="button" onClick={() => {setStep('LOGIN'); setPassword(''); setTwoFaCode('');}} className="text-xs text-slate-500 hover:text-slate-300 mt-4 cursor-pointer">
                            Volver al inicio
                        </button>
                    </form>
                )}

                <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Autenticación Segura &bull; Wide Format S.A.</span>
                </div>
            </div>
        </div>
    );
};

export default Login;