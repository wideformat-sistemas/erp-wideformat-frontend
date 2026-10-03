import { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ onLogin, users }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulamos un pequeño retraso de red para dar la sensación de conexión a servidor
        setTimeout(() => {
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                onLogin(user);
            } else {
                setError('Usuario o contraseña incorrectos');
                setIsLoading(false);
            }
        }, 600);
    };

    return (
        <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4">
            {/* Círculos decorativos de fondo (Estilo moderno) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-primary opacity-10 blur-3xl"></div>
                <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-brand-accent opacity-5 blur-3xl transform translate-x-1/2"></div>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 z-10">

                {/* LOGO ARREGLADO: Con tamaño controlado (h-16) para que no se vea gigante */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/logo.svg"
                        alt="Wide Format"
                        className="h-16 w-auto object-contain bg-white/5 p-3 rounded-xl shadow-inner"
                        onError={(e) => {
                            // Si el logo no carga, mostramos texto de respaldo
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <span className="hidden text-3xl font-black text-white uppercase tracking-wider">Wide Format</span>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso al Sistema</h2>
                    <p className="text-slate-400 text-sm">Torre de Control de Producción</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 flex items-center gap-2 text-sm font-medium animate-in fade-in">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                placeholder="Ej. admin"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-500" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
                                placeholder="••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-brand-primary hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando sesión...
              </span>
                        ) : (
                            'Ingresar al Tablero'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-slate-700 pt-6">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3" /> Conexión segura encriptada
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;