import { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ users, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Buscar si el usuario y contraseña coinciden en la base de datos
        const userMatch = users.find(u => u.username === username && u.password === password);

        if (userMatch) {
            setError('');
            onLogin(userMatch); // Acceso concedido
        } else {
            setError('Credenciales incorrectas. Intente nuevamente.');
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 z-10">
                <div className="text-center mb-8">
                    <img src="/logo.svg" alt="Wide Format" className="h-16 mx-auto mb-4 bg-white/5 p-2 rounded-xl" />
                    <h1 className="text-2xl font-bold text-white">Acceso al Sistema</h1>
                    <p className="text-slate-400 text-sm mt-1">Torre de Control Wide Format</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Usuario</label>
                        <div className="relative">
                            <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                placeholder="Ej. admin"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                placeholder="••••••"
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-brand-primary hover:bg-blue-600 text-white font-bold py-2.5 rounded-lg transition-colors mt-4 shadow-lg shadow-brand-primary/30">
                        Iniciar Sesión
                    </button>
                </form>

                <div className="mt-6 border-t border-white/10 pt-4 text-center">
                    <p className="text-xs text-slate-500">Credenciales de prueba: admin / 123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;