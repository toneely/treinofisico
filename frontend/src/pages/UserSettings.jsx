import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Dumbbell, LayoutGrid, Settings, Palette } from 'lucide-react';
import ExerciseManager from '../components/ExerciseManager';
import BlockConfigurator from '../components/BlockConfigurator';
import WorkoutManager from '../components/WorkoutManager';
import AppearanceSettings from '../components/AppearanceSettings';

const UserSettings = () => {
  const [activeTab, setActiveTab] = useState('workouts');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <Link to="/" className="text-slate-500 flex items-center gap-1 mb-4 hover:text-slate-800 transition w-fit">
          <ChevronLeft size={20} />
          Voltar para Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Configurações do Plano</h1>
        <p className="text-slate-500">Gerencie seus próprios treinos, blocos e exercícios.</p>
      </header>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
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
          icon={<Settings size={18} />}
          label="Estrutura de Blocos"
        />
        <TabButton
          active={activeTab === 'appearance'}
          onClick={() => setActiveTab('appearance')}
          icon={<Palette size={18} />}
          label="Aparência"
        />
      </div>

      <main className="animate-in fade-in duration-500">
        {activeTab === 'workouts' && <WorkoutManager />}
        {activeTab === 'exercises' && <ExerciseManager />}
        {activeTab === 'blocks' && <BlockConfigurator />}
        {activeTab === 'appearance' && <AppearanceSettings />}
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

export default UserSettings;
