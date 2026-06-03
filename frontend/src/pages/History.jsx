import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  FileDown, Activity, Clock, Dumbbell, User, Scale, Ruler
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportHistoryToPDF } from '../utils/pdfExport';

const History = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchUser();
  }, [currentDate]);

  const fetchUser = async () => {
    const { data } = await supabase.from('usuarios').select('*').single();
    setUserData(data);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabase
      .from('historico_cargas')
      .select('*, exercicios(*)')
      .gte('data_treino', startOfMonth)
      .lte('data_treino', endOfMonth)
      .order('data_treino', { ascending: false });

    if (error) console.error(error);
    else setHistory(data || []);
    setLoading(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());

  const days = [];
  // Padding for first week
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const hasTrainOnDay = (day) => {
    if (!day) return false;
    return history.some(h => new Date(h.data_treino).getDate() === day);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const filtered = history.filter(h => new Date(h.data_treino).getDate() === day);
    setSelectedDay(day);
    setDayDetails(filtered);
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleExportPDF = async () => {
    // We'll fetch ALL history for export
    const { data: allHistory } = await supabase
      .from('historico_cargas')
      .select('*, exercicios(*)')
      .order('data_treino', { ascending: false });

    exportHistoryToPDF(userData, allHistory);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen pb-24">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Histórico</h1>
        </div>
        <button
          onClick={handleExportPDF}
          className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 text-sm font-bold"
        >
          <FileDown size={18} /> Exportar
        </button>
      </header>

      {/* Calendário */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <CalendarIcon size={18} className="text-indigo-600" />
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
            <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => handleDayClick(day)}
              disabled={!day}
              className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative ${
                !day ? 'invisible' :
                selectedDay === day ? 'bg-indigo-600 text-white' :
                hasTrainOnDay(day) ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {day}
              {hasTrainOnDay(day) && selectedDay !== day && (
                <div className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Detalhes do Dia */}
      {selectedDay ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sessão de {selectedDay} de {monthNames[currentDate.getMonth()]}</h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{dayDetails.length} registros</span>
          </div>

          {dayDetails.length > 0 ? (
            <div className="space-y-3">
              {dayDetails.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.exercicios.nome}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        <Clock size={10} /> {new Date(item.data_treino).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono font-black text-indigo-600">{item.carga_utilizada}<span className="text-[10px] font-normal text-slate-400 ml-0.5">kg</span></p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{item.repeticoes_feitas} reps</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-100 rounded-3xl border border-dashed border-slate-200 text-slate-400">
              <Activity className="mx-auto mb-2 opacity-20" size={32} />
              <p className="text-sm">Nenhum treino registrado neste dia.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-10 text-center opacity-40">
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selecione um dia para ver os detalhes</p>
        </div>
      )}

      {/* Resumo do Mês */}
      <div className="mt-8 bg-slate-800 rounded-3xl p-6 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity size={80} />
         </div>
         <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-widest">Resumo Mensal</h3>
         <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total de Treinos</p>
               <p className="text-3xl font-black">{Array.from(new Set(history.map(h => new Date(h.data_treino).toDateString()))).length}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Exercícios Totais</p>
               <p className="text-3xl font-black">{history.length}</p>
            </div>
         </div>
      </div>

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center">
        <Link to="/" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link to="/historico" className="text-indigo-600 flex flex-col items-center gap-1">
          <HistoryIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link to="/admin" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <UserIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

export default History;
