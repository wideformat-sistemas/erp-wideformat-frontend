import React, { useState } from 'react';
import { ShieldCheck, Mail, Smartphone, KeyRound, Loader2, AlertTriangle } from 'lucide-react';

const Setup2FA = ({ currentUser, onClose }) => {
    const [method, setMethod] = useState(currentUser?.tipo_2fa || 'NINGUNO');

    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [secretKey, setSecretKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // --- NUEVOS ESTADOS PARA EL MODAL PERSONALIZADO ---
    const [showWarning, setShowWarning] = useState(false);
    const [pendingMethod, setPendingMethod] = useState(null);

    const handleSaveConfig = (selectedMethod) => {
        // En lugar de usar el feo window.confirm, activamos nuestro propio Modal
        if (method === 'APP' && selectedMethod === 'APP' && !qrCodeUrl) {
            setPendingMethod(selectedMethod);
            setShowWarning(true);
            return;
        }
        executeSaveConfig(selectedMethod);
    };

    const executeSaveConfig = async (selectedMethod) => {
        setShowWarning(false); // Cerramos la advertencia si estaba abierta
        setIsLoading(true);
        setMessage('');

        try {
            const API_URL = typeof window !== 'undefined' ? `http://${window.location.hostname}:3001` : 'http://localhost:3001';

            const res = await fetch(`${API_URL}/api/2fa/configurar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, tipo: selectedMethod })
            });
            const data = await res.json();

            if (res.ok) {
                setMethod(selectedMethod);

                const storageUser = JSON.parse(localStorage.getItem('usuario') || '{}');
                storageUser.tipo_2fa = selectedMethod;
                localStorage.setItem('usuario', JSON.stringify(storageUser));

                if (selectedMethod === 'APP') {
                    setQrCodeUrl(data.qrCode);
                    setSecretKey(data.secret);
                    setMessage('✅ Configurado. Escanea este NUEVO código QR con Google Authenticator.');
                } else if (selectedMethod === 'EMAIL') {
                    setQrCodeUrl(null);
                    setMessage('✅ Configurado. Recibirás un código por correo al iniciar sesión.');
                } else {
                    setQrCodeUrl(null);
                    setMessage('✅ Seguridad en 2 pasos desactivada (Solo Contraseña).');
                }
            } else {
                setMessage(`❌ Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('❌ Error de conexión al servidor.');
        }
        setIsLoading(false);
    };

    return (
        <div className="p-6 relative">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" /> Seguridad (2FA)
            </h2>

            <p className="text-sm text-slate-400 mb-6">
                Protege tu cuenta de Wide Format solicitando un código adicional al iniciar sesión.
            </p>

            <div className="space-y-3 mb-6">
                {/* Opción APP */}
                <button
                    onClick={() => handleSaveConfig('APP')}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${method === 'APP' ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                    <Smartphone className={`w-5 h-5 ${method === 'APP' ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div className="text-left flex-1">
                        <p className={`font-bold ${method === 'APP' ? 'text-white' : 'text-slate-300'}`}>Aplicación Autenticadora</p>
                        <p className="text-xs text-slate-500">Google Authenticator o Authy</p>
                    </div>
                    {method === 'APP' && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-1 rounded">ACTIVO</span>}
                </button>

                {/* Opción EMAIL */}
                <button
                    onClick={() => handleSaveConfig('EMAIL')}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${method === 'EMAIL' ? 'bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                    <Mail className={`w-5 h-5 ${method === 'EMAIL' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div className="text-left flex-1">
                        <p className={`font-bold ${method === 'EMAIL' ? 'text-white' : 'text-slate-300'}`}>Correo Electrónico</p>
                        <p className="text-xs text-slate-500">Recibirás un código en tu correo</p>
                    </div>
                    {method === 'EMAIL' && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">ACTIVO</span>}
                </button>

                {/* Opción NINGUNO */}
                <button
                    onClick={() => handleSaveConfig('NINGUNO')}
                    disabled={isLoading}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${method === 'NINGUNO' ? 'bg-slate-800 border-slate-600' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                >
                    <KeyRound className="w-5 h-5 text-slate-500" />
                    <div className="text-left flex-1">
                        <p className={`font-bold ${method === 'NINGUNO' ? 'text-white' : 'text-slate-300'}`}>Solo Contraseña</p>
                        <p className="text-xs text-slate-500">No recomendado</p>
                    </div>
                    {method === 'NINGUNO' && <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded">ACTIVO</span>}
                </button>
            </div>

            {isLoading && <div className="flex justify-center mb-4"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>}

            {message && (
                <div className={`p-3 rounded-lg text-sm mb-4 font-medium ${message.includes('✅') ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
                    {message}
                </div>
            )}

            {qrCodeUrl && method === 'APP' && (
                <div className="bg-slate-800 p-4 rounded-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <p className="text-sm font-bold text-white mb-2">1. Escanea este código QR</p>
                    <div className="bg-white p-2 rounded-lg mb-3">
                        <img src={qrCodeUrl} alt="QR Code 2FA" className="w-40 h-40" />
                    </div>
                    <p className="text-xs text-slate-400 text-center">
                        Si no puedes escanearlo, ingresa esta clave manualmente:<br/>
                        <span className="font-mono text-blue-300 text-sm mt-1 block">{secretKey}</span>
                    </p>
                </div>
            )}

            <button onClick={onClose} className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                Cerrar Panel
            </button>

            {/* --- MODAL DE ADVERTENCIA PERSONALIZADO SUPERPUESTO --- */}
            {showWarning && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm rounded-2xl animate-in fade-in zoom-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl text-center max-w-sm">
                        <div className="mx-auto bg-amber-500/20 w-16 h-16 flex items-center justify-center rounded-full mb-4 border border-amber-500/30">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">¿Regenerar Código QR?</h3>
                        <p className="text-sm text-slate-400 mb-6">
                            Ya tienes una aplicación vinculada. Si generas una nueva llave, <strong className="text-amber-400">los códigos de tu celular actual dejarán de funcionar</strong> y podrías quedarte fuera del sistema.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowWarning(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => executeSaveConfig(pendingMethod)}
                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-600/20"
                            >
                                Sí, Regenerar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Setup2FA;