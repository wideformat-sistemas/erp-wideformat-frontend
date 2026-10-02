import { User, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        navigate('/tablero');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-dark to-brand-primary flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-brand-dark p-8 text-center flex flex-col items-center justify-center">
                    <img src="/logo.svg" alt="Wide Format" className="h-16 object-contain mb-3" />
                    <p className="text-slate-300 text-sm border-t border-slate-600 pt-3 w-full">Sistema Integrado de Producción</p>
                </div>

                <div className="p-8">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Usuario</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                                    placeholder="admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                            Ingresar al Sistema
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;