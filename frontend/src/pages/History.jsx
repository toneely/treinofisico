import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  FileDown, Activity, Clock, Dumbbell, User, Scale, Ruler,
  History as HistoryIcon, User as UserIcon, Trash2, Edit2, Plus,
  Check, X, Bike, List, RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { exportHistoryToPDF } from '../utils/pdfExport';
import { useToast } from '../context/ToastContext';

const History = () => {
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [extraActivities, setExtraActivities] = useState([]);
  const [workoutsMetadata, setWorkoutsMetadata] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  // CRUD States
  const [isEditing, setIsEditing] = useState(null); // {type: 'workout'|'extra', item: object}
  const [showAddForm, setShowAddForm] = useState(null); // 'workout' | 'extra'
  const [exercises, setExercises] = useState([]);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchHistory();
    fetchUser();
    fetchExercises();
    fetchWorkoutsMetadata();
  }, [currentDate]);

  const fetchWorkoutsMetadata = async () => {
    const { data } = await supabase.from('treinos').select('letra, is_coringa');
    setWorkoutsMetadata(data || []);
  };

  const fetchUser = async () => {
    const { data } = await supabase.from('usuarios').select('*').single();
    setUserData(data);
  };

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercicios').select('*').order('nome');
    setExercises(data || []);
  };

  const fetchHistory = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: loads, error: errorLoads } = await supabase
      .from('historico_cargas')
      .select('*, exercicios(*)')
      .gte('data_treino', startOfMonth)
      .lte('data_treino', endOfMonth)
      .order('data_treino', { ascending: false });

    const { data: extras, error: errorExtras } = await supabase
      .from('registro_atividades')
      .select('*')
      .gte('data', startOfMonth)
      .lte('data', endOfMonth)
      .order('data', { ascending: false });

    if (errorLoads) showToast('Erro ao buscar cargas: ' + errorLoads.message, 'error');
    if (errorExtras) showToast('Erro ao buscar atividades: ' + errorExtras.message, 'error');

    setHistory(loads || []);
    setExtraActivities(extras || []);
    setLoading(false);
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getDayActivities = (day) => {
    if (!day) return [];
    const workouts = history.filter(h => new Date(h.data_treino).getDate() === day);
    const extras = extraActivities.filter(e => new Date(e.data).getDate() === day);

    // Group workouts by letra_treino and time
    const groupedWorkouts = workouts.reduce((acc, curr) => {
        const timeKey = new Date(curr.data_treino).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const key = `${curr.letra_treino}_${timeKey}`;
        if (!acc[key]) {
            const meta = workoutsMetadata.find(m => m.letra === curr.letra_treino);
            acc[key] = {
                type: 'workout',
                letra: curr.letra_treino,
                time: timeKey,
                fullDate: curr.data_treino,
                items: [],
                isCoringa: meta ? meta.is_coringa : false
            };
        }
        acc[key].items.push(curr);
        return acc;
    }, {});

    return [
        ...Object.values(groupedWorkouts),
        ...extras.map(e => ({ type: 'extra', id: e.id, nome: e.nome_atividade, time: new Date(e.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), fullDate: e.data }))
    ].sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDeleteWorkout = async (letra, date) => {
    if (window.confirm(`Excluir todo o Treino ${letra} registrado em ${new Date(date).toLocaleString()}?`)) {
        const { error } = await supabase.from('historico_cargas').delete().eq('letra_treino', letra).eq('data_treino', date);
        if (error) showToast('Erro ao excluir: ' + error.message, 'error');
        else {
            showToast('Treino removido do histórico', 'success');
            fetchHistory();
        }
    }
  };

  const handleDeleteExercise = async (id) => {
    if (window.confirm('Excluir este registro de exercício?')) {
        const { error } = await supabase.from('historico_cargas').delete().eq('id', id);
        if (error) showToast('Erro ao excluir: ' + error.message, 'error');
        else {
            showToast('Exercício removido', 'success');
            fetchHistory();
        }
    }
  };

  const handleDeleteExtra = async (id) => {
    if (window.confirm('Excluir esta atividade?')) {
        const { error } = await supabase.from('registro_atividades').delete().eq('id', id);
        if (error) showToast('Erro ao excluir: ' + error.message, 'error');
        else {
            showToast('Atividade removida', 'success');
            fetchHistory();
        }
    }
  };

  const handleAddWorkoutRecord = async (e) => {
    e.preventDefault();
    const cargaVal = typeof formData.carga === 'string' && formData.carga.includes(',')
        ? formData.carga.split(',').map(v => parseFloat(v.trim()))
        : [parseFloat(formData.carga)];

    const { error } = await supabase.from('historico_cargas').insert([{
        usuario_id: userData.id,
        exercicio_id: formData.exercicio_id,
        carga_utilizada: cargaVal,
        repeticoes_feitas: parseInt(formData.reps),
        series_executadas: parseInt(formData.series),
        letra_treino: formData.letra || 'A',
        data_treino: new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 10, 0).toISOString()
    }]);

    if (error) showToast('Erro ao adicionar: ' + error.message, 'error');
    else {
        showToast('Registro adicionado!', 'success');
        setShowAddForm(null);
        fetchHistory();
    }
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    let error;
    if (isEditing.type === 'workout') {
        // Support comma separated string for array conversion
        const cargaVal = typeof formData.carga === 'string' && formData.carga.includes(',')
            ? formData.carga.split(',').map(v => parseFloat(v.trim()))
            : [parseFloat(formData.carga)];

        const { error: err } = await supabase
            .from('historico_cargas')
            .update({
                carga_utilizada: cargaVal,
                repeticoes_feitas: parseInt(formData.reps),
                series_executadas: parseInt(formData.series)
            })
            .eq('id', isEditing.item.id);
        error = err;
    } else {
        const { error: err } = await supabase
            .from('registro_atividades')
            .update({ nome_atividade: formData.nome })
            .eq('id', isEditing.item.id);
        error = err;
    }

    if (error) showToast('Erro ao atualizar: ' + error.message, 'error');
    else {
        showToast('Registro atualizado!', 'success');
        setIsEditing(null);
        fetchHistory();
    }
  };

  const handleAddExtraRecord = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('registro_atividades').insert([{
        usuario_id: userData.id,
        nome_atividade: formData.nome || userData.atividade_alternativa,
        data: new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay, 19, 0).toISOString()
    }]);

    if (error) showToast('Erro ao adicionar: ' + error.message, 'error');
    else {
        showToast('Atividade registrada!', 'success');
        setShowAddForm(null);
        fetchHistory();
    }
  };

  const inheritLastData = async (exercicioId) => {
    const { data } = await supabase
        .from('historico_cargas')
        .select('*')
        .eq('exercicio_id', exercicioId)
        .order('data_treino', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        setFormData(prev => ({
            ...prev,
            carga: data[0].carga_utilizada,
            reps: data[0].repeticoes_feitas,
            series: data[0].series_executadas || 3
        }));
        showToast('Dados herdados da última execução!', 'info');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen pb-24">
      <header className="mb-6 flex justify-between items-center">
        <Link to="/" className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400"><ChevronLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-slate-800">Histórico</h1>
        <button onClick={() => exportHistoryToPDF(userData, history)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200"><FileDown size={18} /></button>
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
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const activities = getDayActivities(day);
            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative ${
                    !day ? 'invisible' : selectedDay === day ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {day}
                {day && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-wrap content-start p-0.5 pointer-events-none overflow-hidden">
                        {activities.map((act, i) => (
                            <div key={i} className={`w-3 h-3 m-0.5 rounded-sm flex items-center justify-center text-[6px] font-black text-white shadow-sm ${
                                act.type === 'extra' ? 'bg-purple-600' : (act.isCoringa ? 'bg-amber-500' : 'bg-emerald-500')
                            }`}>
                                {act.type === 'extra' ? <Activity size={6} /> : act.letra}
                            </div>
                        ))}
                    </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhes do Dia */}
      {selectedDay && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dia {selectedDay} de {monthNames[currentDate.getMonth()]}</h3>
            <div className="flex gap-2">
                <button onClick={() => { setShowAddForm('workout'); setFormData({exercicio_id: exercises[0]?.id}); }} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> Treino</button>
                <button onClick={() => { setShowAddForm('extra'); setFormData({nome: userData.atividade_alternativa}); }} className="p-2 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> Extra</button>
            </div>
          </div>

          {showAddForm && (
            <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-indigo-900">{showAddForm === 'workout' ? 'Adicionar Exercício' : 'Registrar Atividade'}</h4>
                    <button onClick={() => setShowAddForm(null)}><X size={18} /></button>
                </div>
                <form onSubmit={showAddForm === 'workout' ? handleAddWorkoutRecord : handleAddExtraRecord} className="space-y-3">
                    {showAddForm === 'workout' ? (
                        <>
                            <select
                                value={formData.exercicio_id}
                                onChange={(e) => { setFormData({...formData, exercicio_id: e.target.value}); inheritLastData(e.target.value); }}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            >
                                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.nome}</option>)}
                            </select>
                            <div className="grid grid-cols-3 gap-2">
                                <input type="number" placeholder="Carga" value={formData.carga || ''} onChange={e => setFormData({...formData, carga: e.target.value})} className="p-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" placeholder="Reps" value={formData.reps || ''} onChange={e => setFormData({...formData, reps: e.target.value})} className="p-2 border border-slate-200 rounded-lg text-sm" />
                                <input type="number" placeholder="Séries" value={formData.series || ''} onChange={e => setFormData({...formData, series: e.target.value})} className="p-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                        </>
                    ) : (
                        <input type="text" placeholder="Nome da Atividade" value={formData.nome || ''} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    )}
                    <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold">Salvar Registro</button>
                </form>
            </div>
          )}

          <div className="space-y-4">
            {getDayActivities(selectedDay).map((act, idx) => (
                <div key={idx} className="space-y-2">
                    {act.type === 'workout' ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className={`px-4 py-2 flex justify-between items-center ${act.isCoringa ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'}`}>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-lg">TREINO {act.letra}</span>
                                    <span className="text-[10px] opacity-70 uppercase font-bold tracking-tighter">às {act.time}</span>
                                </div>
                                <button onClick={() => handleDeleteWorkout(act.letra, act.fullDate)} className="p-1 hover:bg-white/10 rounded"><Trash2 size={14}/></button>
                            </div>
                            <div className="p-3 space-y-3">
                                {act.items.map((item, i) => (
                                    <div key={i} className="border-b border-slate-50 last:border-0 pb-3 last:pb-0 group">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{item.exercicios.nome}</p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Total: {item.series_executadas} séries</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-mono font-black text-indigo-600">
                                                    {Array.isArray(item.carga_utilizada) ? (item.carga_utilizada[item.carga_utilizada.length - 1]) : item.carga_utilizada}kg
                                                </span>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => { setIsEditing({type: 'workout', item}); setFormData({carga: Array.isArray(item.carga_utilizada) ? item.carga_utilizada.join(', ') : item.carga_utilizada, reps: item.repeticoes_feitas, series: item.series_executadas}); }} className="p-1 text-slate-300 hover:text-indigo-500"><Edit2 size={14}/></button>
                                                    <button onClick={() => handleDeleteExercise(item.id)} className="p-1 text-slate-300 hover:text-red-500"><X size={14}/></button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Series-by-series Detail */}
                                        <div className="grid grid-cols-4 gap-1">
                                            {(item.tempo_execucao_segundos || []).map((t, sIdx) => {
                                                const rest = (item.tempo_descanso_segundos || [])[sIdx];
                                                const load = Array.isArray(item.carga_utilizada) ? item.carga_utilizada[sIdx] : item.carga_utilizada;
                                                return (
                                                    <div key={sIdx} className="bg-slate-50 rounded-lg p-1.5 text-center">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[7px] font-black text-slate-300 uppercase">S{sIdx+1}</span>
                                                            {load !== undefined && <span className="text-[7px] font-bold text-indigo-400">{load}kg</span>}
                                                        </div>
                                                        <span className="block text-[10px] font-bold text-slate-600">{item.repeticoes_feitas} reps</span>
                                                        {rest !== undefined && (
                                                            <span className="flex items-center justify-center gap-0.5 text-[8px] font-bold text-emerald-500 mt-0.5">
                                                                <Clock size={8}/> {Math.floor(rest/60)}:{String(rest%60).padStart(2,'0')}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-purple-600 rounded-2xl p-4 flex justify-between items-center text-white shadow-lg shadow-purple-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Activity size={20}/></div>
                                <div>
                                    <p className="font-black text-lg leading-tight">{act.nome}</p>
                                    <p className="text-[10px] opacity-70 uppercase font-bold">Atividade Alternativa • {act.time}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => { setIsEditing({type: 'extra', item: act}); setFormData({nome: act.nome}); }} className="p-2 hover:bg-white/10 rounded-lg"><Edit2 size={18}/></button>
                                <button onClick={() => handleDeleteExtra(act.id)} className="p-2 hover:bg-white/10 rounded-lg"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {getDayActivities(selectedDay).length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                    <Activity className="mx-auto mb-2 opacity-20" size={40}/>
                    <p className="text-sm font-medium">Nenhum registro para este dia.</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Editar Registro</h2>
                <form onSubmit={handleUpdateRecord} className="space-y-4">
                    {isEditing.type === 'workout' ? (
                        <>
                            <p className="text-sm font-bold text-slate-500">{isEditing.item.exercicios.nome}</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase opacity-50">Carga (kg)</label>
                                    <input type="number" step="0.5" value={formData.carga} onChange={e => setFormData({...formData, carga: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase opacity-50">Repetições</label>
                                        <input type="number" value={formData.reps} onChange={e => setFormData({...formData, reps: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase opacity-50">Séries</label>
                                        <input type="number" value={formData.series} onChange={e => setFormData({...formData, series: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="text-[10px] font-bold uppercase opacity-50">Nome da Atividade</label>
                            <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-lg" />
                        </div>
                    )}
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => setIsEditing(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Cancelar</button>
                        <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <Link to="/" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <Dumbbell size={24} /><span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link to="/historico" className="text-indigo-600 flex flex-col items-center gap-1">
          <HistoryIcon size={24} /><span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link to="/admin" className="text-slate-400 hover:text-indigo-600 flex flex-col items-center gap-1">
          <UserIcon size={24} /><span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

export default History;
