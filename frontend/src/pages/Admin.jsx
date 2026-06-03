import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Dumbbell, LayoutGrid, Settings } from 'lucide-react';
import ExerciseManager from '../components/ExerciseManager';
import BlockConfigurator from '../components/BlockConfigurator';
import GeneralSettings from '../components/GeneralSettings';
import WorkoutManager from '../components/WorkoutManager';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('workouts');

  return (
    <div className="p-6 max-w-4xl mx-auto bg-slate-50 min-h-screen">
      <header className="mb-8">
        <Link to="/" className="text-slate-500 flex items-center gap-1 mb-4 hover:text-slate-800 transition w-fit">
          <ChevronLeft size={20} />
          Voltar para Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">Painel Administrativo</h1>
        <p className="text-slate-500">Gerencie o catálogo de exercícios e configurações do sistema.</p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <TabButton
          active={activeTab === 'workouts'}
          onClick={() => setActiveTab('workouts')}
          icon={<LayoutGrid size={18} />}
          label="Treinos"
        />
        <TabButton
          active={activeTab === 'exercises'}
          onClick={() => setActiveTab('exercises')}
          icon={<Dumbbell size={18} />}
          label="Exercícios"
        />
        <TabButton
          active={activeTab === 'blocks'}
          onClick={() => setActiveTab('blocks')}
          icon={<LayoutGrid size={18} />}
          label="Configurador de Blocos"
        />
        <TabButton
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
          icon={<Settings size={18} />}
          label="Configurações Gerais"
        />
      </div>

      <main>
        {activeTab === 'workouts' && <WorkoutManager />}
        {activeTab === 'exercises' && <ExerciseManager />}
        {activeTab === 'blocks' && <BlockConfigurator />}
        {activeTab === 'settings' && <GeneralSettings />}
      </main>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
    }`}
  >
    {icon}
    {label}
  </button>
);

export default Admin;
