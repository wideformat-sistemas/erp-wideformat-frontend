import { useState, useEffect } from 'react';
import Login from './components/Login';
import KanbanBoard from './components/KanbanBoard';

// Base de datos inicial simulada
const defaultUsers = [
    { id: 1, username: 'admin', password: '123', role: 'Gerente', name: 'Gerente General' },
    { id: 2, username: 'ana', password: '123', role: 'Diseñador', name: 'Ana (Diseño)' },
    { id: 3, username: 'carlos', password: '123', role: 'Operario', name: 'Carlos (Impresión)' }
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

    // Si no hay usuario logueado, mostrar pantalla de Login
    if (!currentUser) {
        return <Login users={users} onLogin={setCurrentUser} />;
    }

    // Si está logueado, mostrar el sistema
    return (
        <KanbanBoard
            currentUser={currentUser}
            onLogout={() => setCurrentUser(null)}
            users={users}
            setUsers={setUsers}
        />
    );
}

export default App;