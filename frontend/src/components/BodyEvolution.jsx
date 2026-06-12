import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Calendar,
  X,
  Loader2,
  Camera,
  Image as ImageIcon,
  Trash2,
  Save,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip, XAxis } from "recharts";
import imageCompression from "browser-image-compression";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [editPhotoData, setEditPhotoData] = useState({ data_foto: "", anotacao: "" });
  const [savingEdit, setSavingEdit] = useState(false);
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

  const swiperRef = useRef(null);

  const fetchData = useCallback(async () => {
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
  }, [user]);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("fotos_progresso")
      .select("*")
      .eq("user_id", user.id)
      .order("data_foto", { ascending: true });

    if (data) {
      setPhotos(data);
    }
  }, [user]);

  const handleUpdatePhoto = async () => {
    if (!selectedPhoto || !user) return;
    setSavingEdit(true);

    const { error } = await supabase
      .from("fotos_progresso")
      .update({
        data_foto: new Date(editPhotoData.data_foto + "T00:00:00").toISOString(),
        anotacao: editPhotoData.anotacao,
      })
      .eq("id", selectedPhoto.id);

    if (error) {
      showToast("Erro ao atualizar: " + error.message, "error");
    } else {
      showToast("Foto atualizada!", "success");
      setPhotos(prev => prev.map(p => p.id === selectedPhoto.id ? {
        ...p,
        data_foto: new Date(editPhotoData.data_foto + "T00:00:00").toISOString(),
        anotacao: editPhotoData.anotacao
      } : p).sort((a, b) => new Date(a.data_foto).getTime() - new Date(b.data_foto).getTime()));
      setShowViewModal(false);
    }
    setSavingEdit(false);
  };

  const handleDeletePhoto = async () => {
    if (!selectedPhoto || !user) return;

    setSavingEdit(true);
    try {
      // Step A: Extract relative paths
      const getPathFromUrl = (url) => {
        const parts = url.split("fotos_evolucao/");
        return parts.length > 1 ? parts[1] : null;
      };

      const pathMedia = getPathFromUrl(selectedPhoto.url_foto_media);
      const pathThumb = getPathFromUrl(selectedPhoto.url_miniatura);

      // Step B: Delete from Storage
      const filesToDelete = [];
      if (pathMedia) filesToDelete.push(pathMedia);
      if (pathThumb) filesToDelete.push(pathThumb);

      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("fotos_evolucao")
          .remove(filesToDelete);

        if (storageError) throw storageError;
      }

      // Step C: Delete from DB
      const { error: dbError } = await supabase
        .from("fotos_progresso")
        .delete()
        .eq("id", selectedPhoto.id);

      if (dbError) throw dbError;

      showToast("Foto excluída com sucesso!", "success");
      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
      setShowDeleteConfirm(false);
      setShowViewModal(false);
    } catch (err) {
      showToast("Erro ao excluir: " + err.message, "error");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (user) {
      const load = async () => {
        await fetchData();
        await fetchPhotos();
      };
      load();
    }
  }, [user, fetchData, fetchPhotos]);

  useEffect(() => {
    if (swiperRef.current && photos.length > 0) {
      swiperRef.current.slideTo(photos.length - 1, 300);
    }
  }, [photos]);

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
      // 1. Compression and format conversion to WebP
      const optionsMedia = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: "image/webp",
      };
      const optionsThumb = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 240,
        useWebWorker: true,
        fileType: "image/webp",
      };

      const [compressedMedia, compressedThumb] = await Promise.all([
        imageCompression(file, optionsMedia),
        imageCompression(file, optionsThumb),
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

      // 4. Save to DB (ensuring timezone safe date)
      const { error: dbError } = await supabase.from("fotos_progresso").insert([
        {
          user_id: user.id,
          url_foto_media: urlMedia,
          url_miniatura: urlThumb,
          anotacao: photoData.anotacao,
          data_foto: new Date(photoData.data_foto + "T00:00:00").toISOString(),
        },
      ]);

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

  if (loading)
    return (
      <div className="p-10 text-center text-slate-400">
        <Loader2 className="animate-spin mx-auto mb-2" /> Carregando evolução...
      </div>
    );

  return (
    <>
      <div className="space-y-8 pb-24 animate-in fade-in duration-500">
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

        <div className="w-full overflow-visible">
          {photos.length === 0 ? (
            <div className="flex justify-center py-4">
              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-32 h-40 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-slate-400 hover:border-slate-200 transition-all shrink-0"
              >
                <Plus size={24} />
                <span className="text-[10px] font-black uppercase">
                  Adicionar
                </span>
              </button>
            </div>
          ) : (
            <div className="photo-carousel-container relative py-4 w-[calc(100%+3rem)] -mx-6">
              <Swiper
                effect={"coverflow"}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={"auto"}
                spaceBetween={-25}
                initialSlide={photos.length - 1}
                coverflowEffect={{
                  rotate: 0,
                  stretch: -15,
                  depth: 100,
                  modifier: 2,
                  slideShadows: false,
                }}
                pagination={{ clickable: true }}
                modules={[EffectCoverflow, Pagination]}
                className="w-full !pb-10"
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                  setTimeout(() => {
                    swiper.slideTo(photos.length - 1, 0);
                  }, 100);
                }}
              >
                {photos.map((photo, index) => (
                  <SwiperSlide key={photo.id} className="!w-auto flex flex-col items-center">
                    {({ isActive }) => (
                      <div
                        className="flex flex-col items-center"
                        onClick={(e) => {
                          const swiper = e.currentTarget.closest(".swiper").swiper;
                          if (!isActive) {
                            swiper.slideTo(index);
                          } else {
                            setSelectedPhoto(photo);
                            setEditPhotoData({
                              data_foto: photo.data_foto.split("T")[0],
                              anotacao: photo.anotacao || ""
                            });
                            setShowViewModal(true);
                          }
                        }}
                      >
                        <div
                          className={`rounded-2xl overflow-hidden shadow-md transition-all duration-300 border-2 ${
                            isActive
                              ? "border-white scale-110"
                              : "border-transparent scale-100 opacity-60"
                          }`}
                          style={{ height: "130px" }}
                        >
                          <img
                            src={photo.url_miniatura}
                            alt={photo.data_foto}
                            className="h-full w-auto object-contain bg-slate-100"
                          />
                        </div>
                        <span className="text-sm font-black text-slate-400 mt-3 uppercase tracking-tighter">
                          {new Date(
                            photo.data_foto.split("T")[0] + "T00:00:00"
                          ).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </SwiperSlide>
                ))}
              </Swiper>

              <style>{`
                .photo-carousel-container .swiper {
                  padding-top: 25px !important;
                  padding-bottom: 30px !important;
                }
                .photo-carousel-container .swiper-pagination-bullet-active {
                  background: var(--color-primary) !important;
                }
                .photo-carousel-container .swiper-slide {
                  transition: transform 0.3s ease;
                }
              `}</style>
            </div>
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

      </div>

      {/* Add Measurement Modal */}
      {showAddModal && createPortal(
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
        </div>,
        document.body
      )}

      {/* Add Photo Modal */}
      {showPhotoModal && createPortal(
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
        </div>,
        document.body
      )}

      {/* Photo View/Edit Modal - Fullscreen */}
      {showViewModal && selectedPhoto && createPortal(
        <div className="fixed inset-0 z-[130] w-screen h-[100dvh] max-w-none m-0 p-0 rounded-none border-none flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <header className="flex justify-end items-center p-4 pt-4 shrink-0">
            <button
              onClick={() => setShowViewModal(false)}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition text-slate-500"
            >
              <X size={24} />
            </button>
          </header>

          {/* Image Area - Flexible */}
          <main className="flex-1 min-h-0 bg-black/5 flex items-center justify-center p-4">
            <img
              src={selectedPhoto.url_foto_media}
              alt="Foto de progresso"
              className="w-full h-full object-contain drop-shadow-lg"
            />
          </main>

          {/* Form Area - Anchored at bottom */}
          <footer className="p-6 flex flex-col gap-4 bg-white border-t border-slate-100 shrink-0">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Data da Foto
                </label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input
                    type="date"
                    value={editPhotoData.data_foto}
                    onChange={(e) => setEditPhotoData({ ...editPhotoData, data_foto: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 font-bold transition-all text-sm"
                    style={{ "--tw-ring-color": "var(--color-primary)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Anotações
                </label>
                <textarea
                  value={editPhotoData.anotacao}
                  onChange={(e) => setEditPhotoData({ ...editPhotoData, anotacao: e.target.value })}
                  className="w-full p-4 mt-1 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 font-medium text-sm transition-all italic leading-relaxed"
                  placeholder="Peso, medidas ou como se sente..."
                  rows={2}
                  style={{ "--tw-ring-color": "var(--color-primary)" }}
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 size={18} />
                <span className="text-[10px] font-black uppercase">Excluir</span>
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdatePhoto}
                  disabled={savingEdit}
                  className="px-8 py-3 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  {savingEdit ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </div>
          </footer>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Excluir foto?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Esta ação é irreversível e removerá os arquivos permanentemente do sistema.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDeletePhoto}
                disabled={savingEdit}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-lg shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {savingEdit ? <Loader2 className="animate-spin" size={20} /> : "Sim, excluir"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Measurement Detail Modal */}
      {showDetailModal && createPortal(
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
        </div>,
        document.body
      )}
    </>
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
