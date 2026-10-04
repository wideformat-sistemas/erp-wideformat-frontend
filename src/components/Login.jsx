import { useState } from 'react';
import { Lock, User, KeyRound, Mail, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';

const Login = ({ onLogin, users }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Estado para controlar la vista de "Recuperar Contraseña"
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoverInput, setRecoverInput] = useState('');
    const [recoverMessage, setRecoverMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Lógica de validación
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            onLogin(user);
        } else {
            setError('Usuario o contraseña incorrectos');
        }
    };

    const handleRecover = (e) => {
        e.preventDefault();
        if (!recoverInput) return;
        setIsSending(true);
        setError('');

        // 1. Buscamos si el usuario o nombre ingresado existe en nuestra base de datos (users)
        const userFound = users.find(u =>
            u.username.toLowerCase() === recoverInput.toLowerCase() ||
            u.name.toLowerCase().includes(recoverInput.toLowerCase())
        );

        if (userFound) {
            // =====================================================================
            // REEMPLAZAR ESTOS VALORES CON LOS DE TU CUENTA GRATIS DE EMAILJS
            // =====================================================================
            const serviceId = 'service_zomo514';    // Tu Service ID
            const templateId = 'template_aa18y7s';  // Tu Template ID
            const publicKey = '10EcePWRPRn0DbhL7';  // Tu Public Key

            // 2. Preparamos los datos para la plantilla del correo
            const templateParams = {
                // Para la demo, forzamos que llegue a TU correo personal
                to_email: 'jorgehugo148@gmail.com',
                nombre_usuario: userFound.name,
                usuario_login: userFound.username,
                password_usuario: userFound.password
            };


            // 3. Enviamos el correo usando EmailJS
            emailjs.send(serviceId, templateId, templateParams, publicKey)
                .then((response) => {
                    console.log('Correo de recuperación enviado!', response.status, response.text);
                    setRecoverMessage('¡Éxito! Las credenciales de acceso han sido enviadas a tu correo de recuperación.');
                    setIsSending(false);
                    setTimeout(() => {
                        setIsRecovering(false);
                        setRecoverMessage('');
                        setRecoverInput('');
                    }, 6000);
                })
                .catch((err) => {
                    console.error('Error al enviar el correo:', err);
                    setError('Hubo un error de conexión al intentar enviar el correo.');
                    setIsSending(false);
                });

        } else {
            // Si el usuario no existe en la base de datos
            setError('No se encontró ninguna cuenta asociada a este dato.');
            setIsSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Elementos decorativos de fondo */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo.svg" alt="Wide Format" className="h-16 mb-4 bg-white/5 p-3 rounded-2xl" />
                    <h1 className="text-2xl font-black text-white tracking-tight">Torre de Control ERP</h1>
                    <p className="text-slate-400 text-sm mt-1">Acceso exclusivo para personal de planta</p>
                </div>

                {!isRecovering ? (
                    /* FORMULARIO DE LOGIN NORMAL */
                    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Usuario</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-500" /></div>
                                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Ej. jperez" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-500" /></div>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="••••••••" />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="button" onClick={() => {setIsRecovering(true); setError('');}} className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2">
                            <ShieldCheck className="w-5 h-5" /> Ingresar al Sistema
                        </button>
                    </form>
                ) : (
                    /* FORMULARIO DE RECUPERACIÓN DE CONTRASEÑA */
                    <form onSubmit={handleRecover} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-2">
                            <KeyRound className="w-12 h-12 text-blue-500 mx-auto mb-3 opacity-80" />
                            <h2 className="text-white font-bold text-lg">Recuperación de Acceso</h2>
                            <p className="text-slate-400 text-xs mt-1">Ingresa tu usuario corporativo. El sistema enviará tus credenciales al correo de respaldo registrado.</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}

                        {recoverMessage && (
                            <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl text-sm font-bold text-center animate-in fade-in">
                                {recoverMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Usuario registrado</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-slate-500" /></div>
                                <input type="text" value={recoverInput} onChange={(e) => setRecoverInput(e.target.value)} required disabled={isSending} className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50" placeholder="Ej. gerencia" />
                            </div>
                        </div>

                        <button type="submit" disabled={isSending} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] flex justify-center items-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
                            {isSending ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Enviando a la red...</>
                            ) : (
                                "Enviar Credenciales"
                            )}
                        </button>

                        <button type="button" onClick={() => {setIsRecovering(false); setError(''); setRecoverMessage('');}} disabled={isSending} className="w-full text-slate-400 hover:text-white font-bold py-2 text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                            <ArrowLeft className="w-4 h-4" /> Volver al Login
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;