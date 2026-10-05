import React, { useState } from 'react';
import { auth } from '../firebase';
import { multiFactor, TotpMultiFactorGenerator, sendEmailVerification } from 'firebase/auth';
import { ShieldCheck, CheckCircle2, MailWarning } from 'lucide-react';

const Setup2FA = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [totpSecret, setTotpSecret] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    const handleStartSetup = async () => {
        setLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("No hay un usuario autenticado.");
            }

            // Forzamos la actualización del token
            await user.getIdToken(true);

            // Verificamos si el correo está verificado
            if (!user.emailVerified) {
                throw new Error("auth/unverified-email");
            }

            const session = await multiFactor(user).getSession();
            const secret = await TotpMultiFactorGenerator.generateSecret(session);
            setTotpSecret(secret);

            const url = secret.generateQrCodeUrl(user.email, "Torre de Control ERP");
            setQrCodeUrl(url);
            setStep(2);
        } catch (err) {
            console.error("Error detallado 2FA:", err);
            if (err.message === "auth/unverified-email" || err.code === "auth/unverified-email") {
                setError("Debes verificar tu correo electrónico antes de configurar el 2FA.");
            } else {
                setError(`Firebase Error: ${err.message || err.code || 'Desconocido'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSendVerificationEmail = async () => {
        setLoading(true);
        setError('');
        try {
            const user = auth.currentUser;
            if (user) {
                await sendEmailVerification(user);
                setVerificationSent(true);
            }
        } catch (err) {
            setError("No se pudo enviar el correo de verificación. Inténtalo más tarde.");
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
            if (!user || !totpSecret) {
                throw new Error("Sesión inválida o secreto no generado.");
            }

            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(
                totpSecret,
                verificationCode
            );

            await multiFactor(user).enroll(multiFactorAssertion, "Autenticador Principal");
            setStep(3);
        } catch (err) {
            console.error("Error al verificar código TOTP:", err);
            setError(`Código incorrecto o expirado. (${err.code || err.message})`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 text-white w-full max-w-md mx-auto bg-slate-900 rounded-xl shadow-xl border border-slate-800">
            <div className="flex items-center space-x-3 mb-6">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                <h2 className="text-xl font-bold">Seguridad de Dos Pasos (2FA)</h2>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-lg text-xs text-red-300 space-y-2">
                    <p>{error}</p>
                    {error.includes("verificar tu correo") && (
                        <button
                            onClick={handleSendVerificationEmail}
                            disabled={loading || verificationSent}
                            className="w-full mt-2 py-1.5 px-3 bg-red-800 hover:bg-red-700 text-white rounded font-medium transition-colors disabled:opacity-50"
                        >
                            {verificationSent ? '¡Correo de verificación enviado!' : 'Enviar correo de verificación'}
                        </button>
                    )}
                </div>
            )}

            {step === 1 && (
                <div className="text-center space-y-4">
                    <p className="text-sm text-slate-300">
                        Protege tu cuenta vinculando una aplicación de autenticación (Google o Microsoft Authenticator).
                    </p>
                    <button
                        onClick={handleStartSetup}
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 font-medium rounded-lg transition-colors text-white disabled:opacity-50"
                    >
                        {loading ? 'Verificando...' : 'Configurar Autenticador'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <form onSubmit={handleVerifyAndEnroll} className="space-y-4">
                    <div className="text-center space-y-2">
                        <p className="text-xs text-slate-300">
                            Escanea este código QR con tu app de autenticación:
                        </p>
                        {qrCodeUrl && (
                            <div className="bg-white p-3 inline-block rounded-lg">
                                <img src={qrCodeUrl} alt="Código QR 2FA" className="w-48 h-48 mx-auto" />
                            </div>
                        )}
                    </div>

                    <div className="relative space-y-1">
                        <label className="text-xs text-slate-400">Introduce el código de 6 dígitos:</label>
                        <input
                            type="text"
                            maxLength="6"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-center tracking-widest text-lg text-white focus:outline-none focus:border-emerald-500"
                            placeholder="000000"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || verificationCode.length < 6}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
                        Su cuenta ya se encuentra vinculada de manera segura con el doble factor de autenticación.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Setup2FA;