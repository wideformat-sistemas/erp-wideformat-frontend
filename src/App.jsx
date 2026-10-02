import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import KanbanBoard from './components/KanbanBoard';

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/tablero" element={<KanbanBoard />} />
        </Routes>
      </Router>
  );
}

export default App;