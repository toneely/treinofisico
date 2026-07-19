import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Inicio from './Inicio';
import History from './History';
import Profile from './Profile';
import Training from './Training';
import BottomNav from '../components/BottomNav';

const Demo = () => {
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'historico', 'perfil'
  const [activeView, setActiveView] = useState('tabs'); // 'tabs', 'training'
  const [selectedLetra, setSelectedLetra] = useState('A');

  return (
    <div className="flex flex-col min-h-screen relative bg-slate-900 text-white select-none">
      {/* Permanent Fixed Header Indicator for Demo Mode */}
      <div className="bg-amber-500 text-slate-950 font-black text-center text-[10px] py-2.5 uppercase tracking-[0.15em] sticky top-0 z-[100] shadow-md animate-pulse">
        Modo Demonstração - Dados de exemplo
      </div>

      <div className="flex-grow pb-24">
        {activeView === 'tabs' ? (
          <>
            {activeTab === 'inicio' && (
              <Inicio
                isDemo={true}
                onStartTraining={(letra) => {
                  setSelectedLetra(letra);
                  setActiveView('training');
                }}
              />
            )}
            {activeTab === 'historico' && <History isDemo={true} />}
            {activeTab === 'perfil' && <Profile isDemo={true} />}

            <BottomNav
              isDemo={true}
              activeTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
            />
          </>
        ) : (
          <Training
            isDemo={true}
            letra={selectedLetra}
            onGoBack={() => setActiveView('tabs')}
          />
        )}
      </div>
    </div>
  );
};

export default Demo;
