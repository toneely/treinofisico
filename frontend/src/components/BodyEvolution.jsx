import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  Scale,
  Ruler,
  Zap,
  Dumbbell,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Calendar,
  X,
  Save,
  Loader2,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  Edit2,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from "recharts";
import imageCompression from "browser-image-compression";
import { CardCarousel } from "./ui/CardCarousel";

const BodyEvolution = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [measurementTypes, setMeasurementTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [formData, setFormData] = useState({
    tipo_medida_id: null,
    valor: "",
    data_medida: new Date().toISOString().split("T")[0],
  });

  const [photoData, setPhotoData] = useState({
    anotacao: "",
    data_foto: new Date().toISOString().split("T")[0],
  });

  const [isEditingAnnotation, setIsEditingAnnotation] = useState(false);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
      fetchPhotos();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: types } = await supabase
      .from("tipos_medida")
      .select("*")
      .order("ordem", { ascending: true });

    const { data: measures } = await supabase
      .from("historico_medidas")
      .select("*")
      .eq("user_id", user.id)
      .order("data_medida", { ascending: true });

    setMeasurementTypes(
      (types || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    );
    setHistory(measures || []);
    setLoading(false);
  };

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("fotos_progresso")
      .select("*")
      .eq("user_id", user.id)
      .order("data_foto", { ascending: true });

    // Group photos by day
    if (data) {
      const grouped = data.reduce((acc, curr) => {
        const dayString = curr.data_foto.split('T')[0];
        const day = new Date(dayString + 'T00:00:00').toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
        if (!acc[day]) acc[day] = [];
        acc[day].push(curr);
        return acc;
      }, {});
      setPhotos(Object.entries(grouped).map(([day, items]) => ({ day, items })));
    }
  };

  const handleOpenAdd = (type) => {
    const lastValue =
      history
        .filter((h) => h.tipo_medida_id === type.id)
        .slice(-1)[0]?.valor || "";

    setFormData({
      tipo_medida_id: type.id,
      valor: lastValue,
      data_medida: new Date().toISOString().split("T")[0],
    });
    setSelectedMeasurement(type);
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("historico_medidas").insert([
      {
        user_id: user.id,
        tipo_medida_id: formData.tipo_medida_id,
        valor: parseFloat(formData.valor),
        data_medida: new Date(formData.data_medida).toISOString(),
      },
    ]);

    if (error) {
      showToast("Erro ao salvar: " + error.message, "error");
    } else {
      showToast("Medida registrada!", "success");
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Compression
      const optionsMedia = { maxSizeMB: 0.8, maxWidthOrHeight: 1080, useWebWorker: true };
      const optionsThumb = { maxSizeMB: 0.1, maxWidthOrHeight: 200, useWebWorker: true };

      const [compressedMedia, compressedThumb] = await Promise.all([
        imageCompression(file, optionsMedia),
        imageCompression(file, optionsThumb)
      ]);

      const timestamp = Date.now();
      const fileNameMedia = `${user.id}/${timestamp}_media.webp`;
      const fileNameThumb = `${user.id}/${timestamp}_thumb.webp`;

      // 2. Storage Upload
      const [uploadMedia, uploadThumb] = await Promise.all([
        supabase.storage.from("fotos_evolucao").upload(fileNameMedia, compressedMedia),
        supabase.storage.from("fotos_evolucao").upload(fileNameThumb, compressedThumb)
      ]);

      if (uploadMedia.error) throw uploadMedia.error;
      if (uploadThumb.error) throw uploadThumb.error;

      // 3. Get Public URLs
      const urlMedia = supabase.storage.from("fotos_evolucao").getPublicUrl(fileNameMedia).data.publicUrl;
      const urlThumb = supabase.storage.from("fotos_evolucao").getPublicUrl(fileNameThumb).data.publicUrl;

      // 4. Save to DB
      const { error: dbError } = await supabase.from("fotos_progresso").insert([{
        user_id: user.id,
        url_foto_media: urlMedia,
        url_miniatura: urlThumb,
        anotacao: photoData.anotacao,
        data_foto: new Date(photoData.data_foto).toISOString()
      }]);

      if (dbError) throw dbError;

      showToast("Foto enviada com sucesso!", "success");
      setShowPhotoModal(false);
      setPhotoData({ anotacao: "", data_foto: new Date().toISOString().split("T")[0] });
      fetchPhotos();
    } catch (err) {
      showToast("Erro no upload: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    try {
      // 1. Delete from Storage
      const pathMedia = photo.url_foto_media.split("/").slice(-2).join("/");
      const pathThumb = photo.url_miniatura.split("/").slice(-2).join("/");

      await Promise.all([
        supabase.storage.from("fotos_evolucao").remove([pathMedia]),
        supabase.storage.from("fotos_evolucao").remove([pathThumb])
      ]);

      // 2. Delete from DB
      const { error } = await supabase
        .from("fotos_progresso")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      showToast("Foto excluída!", "success");
      setShowLightbox(null);
      fetchPhotos();
    } catch (err) {
      showToast("Erro ao excluir: " + err.message, "error");
    }
  };

  const handleUpdateAnnotation = async (photoId) => {
    try {
      const { error } = await supabase
        .from("fotos_progresso")
        .update({ anotacao: editingText })
        .eq("id", photoId);

      if (error) throw error;

      showToast("Anotação atualizada!", "success");
      setIsEditingAnnotation(false);
      setShowLightbox({ ...showLightbox, anotacao: editingText });
      fetchPhotos();
    } catch (err) {
      showToast("Erro ao atualizar: " + err.message, "error");
    }
  };

  const handleUpdateDate = async (photoId, newDate) => {
    try {
      const { error } = await supabase
        .from("fotos_progresso")
        .update({ data_foto: new Date(newDate).toISOString() })
        .eq("id", photoId);

      if (error) throw error;

      showToast("Data atualizada!", "success");
      setShowLightbox({ ...showLightbox, data_foto: newDate });
      fetchPhotos();
    } catch (err) {
      showToast("Erro ao atualizar data: " + err.message, "error");
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">
        <Loader2 className="animate-spin mx-auto mb-2" /> Carregando evolução...
      </div>
    );

  return (
    <div className="space-y-8 pb-24">
      {/* Photo Evolution Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Evolução com Fotos</h3>
          <button
            onClick={() => setShowPhotoModal(true)}
            className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <Camera size={18} style={{ color: 'var(--color-primary)' }} />
          </button>
        </div>

        <div className="w-full overflow-hidden">
          {photos.length === 0 ? (
            <button
              onClick={() => setShowPhotoModal(true)}
              className="w-32 h-40 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-slate-400 hover:border-slate-200 transition-all shrink-0 mx-auto"
            >
              <Plus size={24} />
              <span className="text-[10px] font-black uppercase">Adicionar</span>
            </button>
          ) : (
            <CardCarousel
              images={photos.flatMap(group => group.items).map(photo => {
                const dayString = photo.data_foto.split('T')[0];
                return {
                  id: photo.id,
                  src: photo.url_miniatura,
                  alt: "Foto de Progresso",
                  date: dayString,
                  annotation: photo.anotacao,
                  raw: photo
                };
              })}
              onImageClick={(img) => setShowLightbox(img.raw)}
            />
          )}
        </div>
      </section>

      {/* Measurements Grid */}
      <div className="grid grid-cols-2 gap-4">
        {measurementTypes.map((type) => {
          const typeHistory = history.filter((h) => h.tipo_medida_id === type.id);
          const last = typeHistory[typeHistory.length - 1];
          const prev = typeHistory[typeHistory.length - 2];
          const delta = last && prev ? (last.valor - prev.valor).toFixed(1) : null;
          const isGood =
            delta !== null &&
            ((type.objetivo_diminuir && delta < 0) ||
              (!type.objetivo_diminuir && delta > 0));
          const isNeutral = delta == 0;

          return (
            <div
              key={type.id}
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group active:scale-95 transition-all cursor-pointer"
              onClick={() => {
                setSelectedMeasurement(type);
                setShowDetailModal(true);
              }}
            >
              {/* Sparkline Background */}
              <div className="absolute inset-0 opacity-30 pointer-events-none -bottom-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={typeHistory.slice(-5)} margin={{ top: 40, right: 0, left: 0, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="var(--color-primary)"
                      strokeWidth={4}
                      strokeOpacity={0.8}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="invisible">
                    <IconRenderer name={type.icone} size={20} />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAdd(type);
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:bg-slate-50"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                  {type.nome}
                </h4>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800">
                    {last?.valor || "--"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {type.unidade}
                  </span>
                </div>

                {delta !== null && (
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] font-black ${isNeutral ? "text-slate-400" : isGood ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {delta > 0 ? (
                      <TrendingUp size={10} />
                    ) : (
                      <TrendingDown size={10} />
                    )}
                    {Math.abs(delta)} {type.unidade}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Measurement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus size={20} style={{ color: "var(--color-primary)" }} />
              Registrar {selectedMeasurement?.nome}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Valor ({selectedMeasurement?.unidade})
                </label>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold text-xl transition-all"
                  style={{ "--tw-ring-color": "var(--color-primary)" }}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Data
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    type="date"
                    value={formData.data_medida}
                    onChange={(e) =>
                      setFormData({ ...formData, data_medida: e.target.value })
                    }
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all"
                    style={{ "--tw-ring-color": "var(--color-primary)" }}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-2xl font-black shadow-lg transition-all"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Camera size={20} style={{ color: "var(--color-primary)" }} />
              Nova Foto de Progresso
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <ImageIcon size={24} />
                  <span className="text-[8px] font-black uppercase">Galeria</span>
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[8px] font-black uppercase">Câmera</span>
                </button>
              </div>

              {uploading && (
                <div className="flex items-center justify-center py-4 text-slate-400 gap-2 text-xs font-bold">
                  <Loader2 className="animate-spin" size={16} /> Processando imagem...
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUploadPhoto}
              />
              <input
                type="file"
                ref={cameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleUploadPhoto}
              />

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Anotação (Opcional)</label>
                <textarea
                  value={photoData.anotacao}
                  onChange={e => setPhotoData({...photoData, anotacao: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold text-sm transition-all"
                  placeholder="Ex: Pós treino de pernas"
                  rows={2}
                  style={{ '--tw-ring-color': 'var(--color-primary)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                <input
                  type="date"
                  value={photoData.data_foto}
                  onChange={e => setPhotoData({...photoData, data_foto: e.target.value})}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all"
                  style={{ '--tw-ring-color': 'var(--color-primary)' }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 p-4">
          <div className="absolute top-6 right-6 flex gap-3">
            <button
              onClick={() => {
                if(window.confirm("Deseja realmente excluir esta foto?")) {
                  handleDeletePhoto(showLightbox);
                }
              }}
              className="p-3 bg-rose-500/20 rounded-full text-rose-500 hover:bg-rose-500/40 transition"
            >
              <Trash2 size={24} />
            </button>
            <button
              onClick={() => setShowLightbox(null)}
              className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="w-full max-w-lg flex flex-col gap-6">
            <div className="rounded-[40px] overflow-hidden shadow-2xl border border-white/10 relative aspect-square bg-slate-900">
              <img src={showLightbox.url_foto_media} alt="Progresso" className="w-full h-full object-contain" />

              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent group">
                {isEditingAnnotation ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => handleUpdateAnnotation(showLightbox.id)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateAnnotation(showLightbox.id)}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    />
                    <button
                      onClick={() => handleUpdateAnnotation(showLightbox.id)}
                      className="p-2 bg-emerald-500 rounded-lg text-white"
                    >
                      <Save size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-4">
                    <p className="text-white text-sm font-bold leading-relaxed italic">
                      {showLightbox.anotacao || "Sem anotação..."}
                    </p>
                    <button
                      onClick={() => {
                        setEditingText(showLightbox.anotacao || "");
                        setIsEditingAnnotation(true);
                      }}
                      className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition shrink-0"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex flex-col items-center gap-2">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Data da Foto</label>
                <input
                  type="date"
                  value={showLightbox.data_foto.split('T')[0]}
                  onChange={(e) => handleUpdateDate(showLightbox.id, e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] block">
                {new Date(showLightbox.data_foto.split('T')[0] + 'T00:00:00').toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">
                  {selectedMeasurement?.nome}
                </h2>
                <p className="text-sm text-slate-400">
                  Histórico de evolução corporal
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 bg-slate-50 rounded-full text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="h-64 w-full mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history.filter(
                    (h) => h.tipo_medida_id === selectedMeasurement?.id,
                  )}
                >
                  <XAxis
                    dataKey="data_medida"
                    tickFormatter={(str) =>
                      new Date(str).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    fontSize={10}
                    tick={{ fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    labelFormatter={(str) => new Date(str).toLocaleDateString("pt-BR")}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="var(--color-primary)"
                    strokeWidth={5}
                    strokeOpacity={0.8}
                    dot={{
                      fill: "var(--color-primary)",
                      strokeWidth: 2,
                      r: 4,
                      stroke: "#fff",
                    }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Registros Recentes
              </h3>
              <div className="space-y-2">
                {history
                  .filter((h) => h.tipo_medida_id === selectedMeasurement?.id)
                  .reverse()
                  .map((h) => (
                    <div
                      key={h.id}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-300" />
                        <span className="text-sm font-bold text-slate-600">
                          {new Date(h.data_medida).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <span className="text-lg font-black text-slate-800">
                        {h.valor} {selectedMeasurement?.unidade}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IconRenderer = ({ name, size }) => {
  switch (name) {
    case "Scale":
      return <Scale size={size} />;
    case "Ruler":
      return <Ruler size={size} />;
    case "Zap":
      return <Zap size={size} />;
    case "Dumbbell":
      return <Dumbbell size={size} />;
    default:
      return <Scale size={size} />;
  }
};

export default BodyEvolution;
