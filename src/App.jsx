import { useState, useEffect } from 'react';
import Login from './components/Login';
import KanbanBoard from './components/KanbanBoard';

// Base de datos inicial simulada
const defaultUsers = [
    { id: 1, username: 'admin', password: '123', role: 'Gerente', name: 'Gerente General' },
    { id: 2, username: 'ana', password: '123', role: 'Diseñador', name: 'Ana (Diseño)' },
    { id: 3, username: 'carlos', password: '123', role: 'Operario', name: 'Carlos (Impresor)' }
];

function App() {
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('wideformat_users_db');
        return saved ? JSON.parse(saved) : defaultUsers;
    });

    const [currentUser, setCurrentUser] = useState(null);

    // Guardar usuarios si el administrador hace cambios
    useEffect(() => {
        localStorage.setItem('wideformat_users_db', JSON.stringify(users));
    }, [users]);

    return (
        // CONTENEDOR CON EL DEGRADADO AZUL ORIGINAL
        <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#1e293b] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
            {!currentUser ? (
                <Login users={users} onLogin={setCurrentUser} />
            ) : (
                <KanbanBoard
                    currentUser={currentUser}
                    onLogout={() => setCurrentUser(null)}
                    users={users}
                    setUsers={setUsers}
                />
            )}
        </div>
    );
}

export default App;