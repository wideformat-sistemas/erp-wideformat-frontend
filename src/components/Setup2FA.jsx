import { useState } from 'react';
import { ShieldCheck, QrCode, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react'; // Generación 100% local en el navegador

const Setup2FA = () => {
    const [step, setStep] = useState(1);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [totpSecret, setTotpSecret] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleStartSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            const session = await multiFactor(user).getSession();
            const secret = await TotpMultiFactorGenerator.generateSecret(session);
            setTotpSecret(secret);

            const url = secret.generateQrCodeUrl(user.email, "Torre de Control ERP");
            setQrCodeUrl(url);
            setStep(2);
        } catch (err) {
            console.error(err);
            setError('Error al iniciar la configuración de 2FA. Inicie sesión nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnroll = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
                totpSecret,
                verificationCode
            );

            await multiFactor(user).enroll(assertion, "Autenticador de Planta");
            setStep(3);
        } catch (err) {
            console.error(err);
            setError('El código es incorrecto o expiró.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-xl text-white mx-auto my-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Seguridad de Dos Pasos (2FA)</h3>
                    <p className="text-xs text-slate-400">Google o Microsoft Authenticator</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
                </div>
            )}

            {step === 1 && (
                <div className="text-center py-4">
                    <p className="text-sm text-slate-300 mb-6">
                        Proteja su cuenta vinculando una aplicación de autenticación para solicitar códigos de 6 dígitos al iniciar sesión.
                    </p>
                    <button
                        onClick={handleStartSetup}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                        {loading ? 'Generando...' : <><QrCode className="w-5 h-5" /> Configurar Autenticador</>}
                    </button>
                </div>
            )}

            {step === 2 && (
                <form onSubmit={handleVerifyAndEnroll} className="space-y-4">
                    <div className="text-center">
                        <p className="text-xs text-slate-300 mb-3">
                            1. Abra su app de autenticación y escanee este código QR:
                        </p>
                        {/* Generación local segura sin APIs externas */}
                        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-2">
                            <QRCodeSVG value={qrCodeUrl} size={180} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider text-center">
                            2. Ingrese el código de 6 dígitos
                        </label>
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
                                className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl bg-slate-950 text-white text-center text-xl tracking-widest font-mono placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="000000"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || verificationCode.length < 6}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                    </button>
                </form>
            )}

            {step === 3 && (
                <div className="text-center py-6 space-y-3">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                    <h4 className="font-bold text-lg text-white">¡Protección Activada!</h4>
                    <p className="text-xs text-slate-300">
                        Su cuenta ya se encuentra vinculada de manera segura.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Setup2FA;