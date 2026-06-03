import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import History from './pages/History';
import Training from './pages/Training';

const App = () => {
  return (
    <Router>
      <div className="font-sans antialiased text-slate-900 bg-slate-50 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/historico" element={<History />} />
          <Route path="/treino/:letra" element={<Training />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
