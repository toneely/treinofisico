import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ExerciseManager = ({ overrideUserId = null }) => {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    alvo_principal: '',
    tipo_fibra: 'Tipo IIa',
    categoria: 'Empurrar',
    depende_peso_corporal: false,
    descanso_passivo_segundos: 60
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exercicios')
      .select('*')
      .eq('user_id', overrideUserId || authUser.id)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao buscar exercícios:', error);
    } else {
      setExercises(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userId = overrideUserId || authUser.id;
    if (isEditing) {
      const { error } = await supabase
        .from('exercicios')
        .update({ ...formData, user_id: userId })
        .eq('id', isEditing)
        .eq('user_id', userId);

      if (error) showToast('Erro ao atualizar exercício: ' + error.message, 'error');
      else {
        showToast('Exercício atualizado com sucesso!', 'success');
        setIsEditing(null);
        resetForm();
        fetchExercises();
      }
    } else {
      const { error } = await supabase
        .from('exercicios')
        .insert([{ ...formData, user_id: userId }]);

      if (error) showToast('Erro ao criar exercício: ' + error.message, 'error');
      else {
        showToast('Exercício criado com sucesso!', 'success');
        resetForm();
        fetchExercises();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      alvo_principal: '',
      tipo_fibra: 'Tipo IIa',
      categoria: 'Empurrar',
      depende_peso_corporal: false,
      descanso_passivo_segundos: 60
    });
    setIsEditing(null);
  };

  const handleEdit = (exercise) => {
    setIsEditing(exercise.id);
    setFormData({
      nome: exercise.nome,
      alvo_principal: exercise.alvo_principal,
      tipo_fibra: exercise.tipo_fibra,
      categoria: exercise.categoria,
      depende_peso_corporal: exercise.depende_peso_corporal,
      descanso_passivo_segundos: exercise.descanso_passivo_segundos || 60
    });
  };

  const handleDelete = async (id) => {
    const userId = overrideUserId || authUser.id;
    if (window.confirm('Tem certeza que deseja excluir este exercício?')) {
      const { error } = await supabase
        .from('exercicios')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) showToast('Erro ao excluir exercício: ' + error.message, 'error');
      else {
        showToast('Exercício excluído!', 'success');
        fetchExercises();
      }
    }
  };

  const filteredExercises = exercises.filter(ex =>
    ex.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.alvo_principal.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Search size={20} className="text-indigo-600" />
          Gerenciar Exercícios
        </h2>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alvo Principal</label>
            <input
              type="text"
              name="alvo_principal"
              value={formData.alvo_principal}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Fibra</label>
            <select
              name="tipo_fibra"
              value={formData.tipo_fibra}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Tipo I">Tipo I (Resistência)</option>
              <option value="Tipo IIa">Tipo IIa (Mista)</option>
              <option value="Tipo IIx">Tipo IIx (Explosão/Força)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Empurrar">Empurrar</option>
              <option value="Puxar">Puxar</option>
              <option value="Perna">Perna</option>
              <option value="Postural">Postural</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Descanso (seg)</label>
            <input
              type="number"
              name="descanso_passivo_segundos"
              value={formData.descanso_passivo_segundos}
              onChange={handleInputChange}
              className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              name="depende_peso_corporal"
              id="depende_peso_corporal"
              checked={formData.depende_peso_corporal}
              onChange={handleInputChange}
              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="depende_peso_corporal" className="text-sm font-medium text-slate-700">Depende de Peso Corporal</label>
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition flex items-center gap-2"
              >
                <X size={18} /> Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
            >
              {isEditing ? <Check size={18} /> : <Plus size={18} />}
              {isEditing ? 'Atualizar Exercício' : 'Adicionar Exercício'}
            </button>
          </div>
        </form>

        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar exercícios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Carregando catálogo...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Nome</th>
                  <th className="py-3 px-4 font-bold">Alvo</th>
                  <th className="py-3 px-4 font-bold">Fibra</th>
                  <th className="py-3 px-4 font-bold">Cat.</th>
                  <th className="py-3 px-4 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredExercises.map(exercise => (
                  <tr key={exercise.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-slate-800">{exercise.nome}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{exercise.alvo_principal}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        exercise.tipo_fibra === 'Tipo IIx' ? 'bg-red-100 text-red-600' :
                        exercise.tipo_fibra === 'Tipo IIa' ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {exercise.tipo_fibra}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{exercise.categoria}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(exercise)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(exercise.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseManager;
