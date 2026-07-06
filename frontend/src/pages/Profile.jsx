import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AdBanner from "../components/ui/AdBanner";
import {
  ChevronLeft,
  User,
  Mail,
  LogOut,
  X,
  Camera,
  Save,
  CheckCircle2,
  Lock,
  Loader2,
  Check,
  Image as ImageIcon,
  Palette,
  Dumbbell,
  History as HistoryIcon,
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Copy,
  AlertCircle,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { useAppearance } from "../context/AppearanceContext";

const Profile = () => {
  const { user, profile, refreshProfile, signOut, isPremium } = useAuth();
  const { showToast } = useToast();
  const { settings, updateAppearance } = useAppearance();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const mpRef = useRef(null);

  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardExpirationMonth: "",
    cardExpirationYear: "",
    securityCode: "",
    cardholderName: "",
    identificationType: "CPF",
    identificationNumber: "",
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nome: "",
    foco_treino: "",
    atividade_alternativa: "Capoeira",
    avatar_url: null,
    testador_pagamento: false,
    status_assinatura: "free",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [appSettings, setAppSettings] = useState({ subscription_price: 29.90 });

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase.from('config_app').select('*').single();
      if (data) setAppSettings(data);
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (profile) {
      const timer = setTimeout(() => {
        setFormData({
          nome: profile.nome || "",
          foco_treino: profile.foco_treino || "",
          atividade_alternativa: profile.atividade_alternativa || "Capoeira",
          avatar_url: profile.avatar_url || null,
          testador_pagamento: profile.testador_pagamento || false,
          status_assinatura: profile.status_assinatura || "free",
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Initialize Mercado Pago V2 with Public Key from Netlify/Vite Env
  useEffect(() => {
    const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    if (window.MercadoPago && !mpRef.current && publicKey) {
      mpRef.current = new window.MercadoPago(publicKey);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCardInputChange = (e) => {
    const { name, value } = e.target;
    setCardData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) {
      showToast("Erro: Usuário não identificado.", "error");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("usuarios")
      .update({
        nome: formData.nome,
        foco_treino: formData.foco_treino,
        atividade_alternativa: formData.atividade_alternativa,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Erro no RLS/Update:", error);
      showToast("Erro ao salvar: " + error.message, "error");
    } else {
      showToast("Perfil atualizado!", "success");
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 400, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileName = `${user.id}/${Date.now()}_avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatares")
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("avatares").getPublicUrl(fileName).data.publicUrl;

      const { error: dbError } = await supabase
        .from("usuarios")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (dbError) throw dbError;

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      showToast("Foto de perfil atualizada!", "success");
      setShowAvatarModal(false);
    } catch (err) {
      showToast("Erro no upload: " + err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("As senhas não coincidem", "error");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showToast("A senha deve ter pelo menos 6 caracteres", "error");
      return;
    }

    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      showToast("Erro ao atualizar senha: " + error.message, "error");
    } else {
      showToast("Senha alterada com sucesso!", "success");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
    setUpdatingPassword(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
    showToast("Sessão encerrada", "info");
  };

  const handleColorChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    const { error } = await updateAppearance(newSettings);
    if (error) showToast("Erro ao atualizar cor: " + error.message, "error");
  };

  async function handlePaymentInitiation(paymentType) {
    if (paymentType === 'card_recurring' || paymentType === 'card_one_time') {
      setShowCardModal(paymentType);
      return;
    }

    setCreatingPayment(paymentType);
    try {
      const { data, error } = await supabase.functions.invoke('mercado-pago-subscription', {
        body: {
          paymentType,
          external_reference: user.id,
          email: user.email,
          transaction_amount: appSettings.subscription_price
        }
      });

      if (error) throw error;

      if (data?.init_point) {
        showToast("Redirecionando para o Mercado Pago...", "info");
        window.location.href = data.init_point;
      } else if (data?.qr_code_base64) {
        setPixData(data);
        showToast("QR Code gerado!", "success");
      } else {
        throw new Error("Resposta inválida do servidor.");
      }
    } catch (e) {
      console.error("Erro no pagamento:", e);
      showToast("Erro: " + e.message, "error");
    } finally {
      setCreatingPayment(null);
    }
  };

  const handleProcessCardPayment = async (e) => {
    e.preventDefault();
    if (!mpRef.current) {
      showToast("SDK do Mercado Pago não inicializado.", "error");
      return;
    }

    setCreatingPayment(showCardModal);
    try {
      // 1. Get Payment Method (Brand)
      const paymentMethods = await mpRef.current.getPaymentMethods({
        bin: cardData.cardNumber.replace(/\s/g, '').substring(0, 6)
      });
      const paymentMethodId = paymentMethods.results?.[0]?.id || 'visa';

      // 2. Generate Card Token
      const tokenResponse = await mpRef.current.createCardToken({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.cardExpirationMonth,
        cardExpirationYear: cardData.cardExpirationYear,
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber,
      });

      if (tokenResponse.error) {
        throw new Error(tokenResponse.error[0]?.message || "Erro ao validar cartão.");
      }

      const cardToken = tokenResponse.id;

      // 3. Call Edge Function
      const { data, error } = await supabase.functions.invoke('mercado-pago-subscription', {
        body: {
          paymentType: showCardModal,
          external_reference: user.id,
          email: user.email,
          token: cardToken,
          payment_method_id: paymentMethodId,
          installments: 1,
          transaction_amount: appSettings.subscription_price
        }
      });

      if (error) throw error;

      if (data.status === 'approved') {
        showToast("Pagamento aprovado!", "success");
        setShowCardModal(false);
        await refreshProfile();
      } else {
        showToast(`Status: ${data.status}`, "info");
      }
    } catch (e) {
      console.error("Erro no checkout transparente:", e);
      showToast("Erro: " + e.message, "error");
    } finally {
      setCreatingPayment(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast("Código PIX copiado!", "success");
  };

  return (
    <div
      className="p-6 max-w-2xl mx-auto"
      style={{ paddingBottom: isPremium ? "80px" : "148px" }}
    >
      <header className="mb-8 flex justify-between items-center px-2">
        <Link
          to="/inicio"
          className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-2xl font-black ">Meu Perfil</h1>
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:opacity-70 transition text-slate-400"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* 1. Identification Card */}
      <section className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200 mb-6 flex flex-col items-center">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg"
            style={{
              backgroundColor: "var(--color-secondary)",
              color: "var(--text-on-secondary)",
            }}
          >
            {formData.avatar_url ? (
              <img
                src={formData.avatar_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={40} className="text-white" />
            )}
          </div>
          <button
            onClick={() => setShowAvatarModal(true)}
            className="absolute -bottom-2 -right-2 p-2 rounded-xl shadow-lg border-2 border-white"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--text-on-primary)",
            }}
          >
            <Camera size={14} />
          </button>
        </div>
        <h2 className="text-xl font-bold ">{formData.nome || "Atleta"}</h2>
        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
          <Mail size={14} /> {user.email}
        </div>
        {user.email === "tone.mendes@gmail.com" && (
          <Link
            to="/admin"
            className="mt-4 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition"
          >
            Painel Administrativo
          </Link>
        )}
      </section>

      <div className="space-y-6 px-1">
        {/* 2. Account Data (Dados Pessoais) */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <User style={{ color: "var(--color-primary)" }} size={18} />
            <h3 className="font-bold  uppercase text-xs tracking-widest">
              Dados da Conta
            </h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nome de Exibição
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1 opacity-60">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                E-mail (Referência)
              </label>
              <input
                type="text"
                value={user.email}
                readOnly
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none font-bold cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Foco de Treino
              </label>
              <input
                type="text"
                name="foco_treino"
                value={formData.foco_treino}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
                placeholder="Ex: Calistenia / Musculação"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Atividade Alternativa
              </label>
              <input
                type="text"
                name="atividade_alternativa"
                value={formData.atividade_alternativa}
                onChange={handleInputChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold  transition-all focus:shadow-[0_0_0_2px_var(--color-primary)]"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--text-on-primary)",
              }}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Save size={18} /> Salvar Dados
                </>
              )}
            </button>
          </div>
        </section>

        {/* 3. Mercado Pago Payment Card - Positioned directly below Account Data */}
        {formData.testador_pagamento && formData.status_assinatura !== 'premium' && (
          <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="p-8 border-b border-slate-50 text-center">
              <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                Upgrade para Premium
              </span>
              <div className="flex items-baseline justify-center gap-2 mt-2">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appSettings.subscription_price)}
                </span>
                <span className="text-base font-bold text-slate-400">/ mes</span>
              </div>

              <ul className="mt-10 space-y-5 text-left max-w-[260px] mx-auto">
                <li className="flex items-start gap-4 text-slate-700 text-sm font-bold leading-snug">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Experiência completa sem anúncios</span>
                </li>
              </ul>
            </div>

            <div className="p-8 space-y-8">
              {/* Section 1: Recurring */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Assinaturas (Renovação Automática)
                </h4>
                <button
                  onClick={() => handlePaymentInitiation('card_recurring')}
                  disabled={!!creatingPayment}
                  className="w-full py-5 rounded-2xl font-black text-sm transition-all flex items-center justify-between px-8 shadow-xl active:scale-95"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "var(--text-on-primary)",
                  }}
                >
                  <span>Cartão de Crédito</span>
                  {creatingPayment === 'card_recurring' ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} className="opacity-40" />}
                </button>

                <button
                  onClick={() => handlePaymentInitiation('native_subscription')}
                  disabled={!!creatingPayment}
                  className="w-full py-5 bg-[#009EE3] text-white rounded-2xl shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-1.5"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    {creatingPayment === 'native_subscription' ? <Loader2 className="animate-spin" size={20} /> : (
                      <>
                        <svg viewBox="130 65 285 285" className="h-7 w-auto" fill="white">
                          <path d="m228.53,179.22c-.07.14-1.45,1.56-.55,2.71,2.18,2.78,8.91,4.38,15.72,2.85,4.05-.91,9.25-5.04,14.28-9.03,5.45-4.33,10.86-8.67,16.3-10.39,5.76-1.83,9.45-1.05,11.89-.31,2.67.8,5.82,2.56,10.84,6.32,9.45,7.1,47.43,40.26,54,45.99,5.28-2.39,30.47-12.56,62.39-19.6-2.78-17.02-13.01-33.25-28.72-45.99-21.89,9.19-50.42,14.7-76.58,1.93-.13-.05-14.29-6.75-28.25-6.42-20.75.48-29.74,9.46-39.25,18.97l-12.05,12.99Z"/>
                          <path d="m349.44,220.97c-.45-.4-44.67-39.09-54.69-46.62-5.8-4.35-9.02-5.46-12.41-5.89-1.76-.23-4.2.1-5.9.57-4.66,1.27-10.75,5.34-16.16,9.63-5.6,4.46-10.88,8.66-15.79,9.76-6.26,1.4-13.91-.25-17.4-2.61-1.41-.95-2.41-2.05-2.89-3.16-1.29-2.99,1.09-5.38,1.48-5.78l12.2-13.2c1.42-1.41,2.85-2.83,4.31-4.23-3.94.51-7.58,1.52-11.12,2.5-4.42,1.24-8.68,2.42-12.98,2.42-1.8,0-11.42-1.58-13.25-2.07-11.05-3.02-23.56-5.97-38.04-12.73-17.35,12.91-28.65,28.77-32,46.56,2.49.66,9.02,2.15,10.71,2.52,39.26,8.73,51.49,17.72,53.71,19.6,2.4-2.67,5.87-4.36,9.73-4.36,4.35,0,8.26,2.19,10.64,5.56,2.25-1.78,5.35-3.3,9.36-3.29,1.82,0,3.71.34,5.62.98,4.43,1.52,6.72,4.47,7.9,7.14,1.48-.67,3.31-1.17,5.46-1.16,2.12,0,4.32.48,6.53,1.44,7.24,3.11,8.36,10.22,7.71,15.58.52-.06,1.04-.08,1.56-.08,8.58,0,15.56,6.98,15.56,15.57,0,2.66-.68,5.16-1.86,7.35,2.34,1.31,8.29,4.28,13.52,3.62,4.17-.53,5.76-1.95,6.32-2.76.39-.55.8-1.2.42-1.66l-11.08-12.3s-1.82-1.73-1.22-2.39c.62-.68,1.75.3,2.55.96,5.64,4.71,12.52,11.81,12.52,11.81.12.08.57.98,3.12,1.43,2.19.39,6.07.17,8.76"/>
                        </svg>
                        <span className="text-base font-bold">Mercado Pago</span>
                      </>
                    )}
                  </div>
                  <span className="text-[9px] text-white/80 normal-case font-bold italic text-center">Para clientes com conta Mercado Pago</span>
                </button>
              </div>

              {/* Section 2: One-time */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Pagamentos Avulsos (30 dias)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePaymentInitiation('pix_one_time')}
                    disabled={!!creatingPayment}
                    className="py-5 bg-transparent hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center border-2 border-slate-100 gap-2 active:scale-95"
                  >
                    <QrCode size={20} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight">PIX</span>
                  </button>

                  <button
                    onClick={() => handlePaymentInitiation('card_one_time')}
                    disabled={!!creatingPayment}
                    className="py-5 bg-transparent hover:bg-slate-50 text-slate-600 rounded-2xl font-bold text-xs transition-all flex flex-col items-center justify-center border-2 border-slate-100 gap-2 active:scale-95"
                  >
                    <CreditCard size={20} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-tight">CARTÃO</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-2">
                <Lock size={12} /> Pagamento Seguro
              </div>
            </div>
          </section>
        )}

        {/* 4. Status for Premium Users */}
        {formData.testador_pagamento && formData.status_assinatura === 'premium' && (
          <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] p-6 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest">Status da Conta</h3>
                <p className="text-slate-900 font-bold">Assinatura Premium Ativa</p>
              </div>
            </div>
            <span className="px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg">Sandbox</span>
          </section>
        )}

        {/* 5. Appearance Section */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <Palette style={{ color: "var(--color-primary)" }} size={18} />
            <h3 className="font-bold  uppercase text-xs tracking-widest">
              Aparência
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cor Primária / Destaque A
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.color_ex_a}
                    onChange={(e) => handleColorChange("color_ex_a", e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-mono text-xs uppercase font-bold text-slate-500">
                    {settings.color_ex_a}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Cor Secundária / Destaque B
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.color_ex_b}
                    onChange={(e) => handleColorChange("color_ex_b", e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent"
                  />
                  <div className="flex-1 px-3 py-2 bg-slate-50 rounded-xl font-mono text-xs uppercase font-bold text-slate-500">
                    {settings.color_ex_b}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Security (Nova Senha) */}
        <section className="bg-white rounded-[32px] overflow-hidden shadow-xl border border-slate-200">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
            <Lock style={{ color: "var(--color-secondary)" }} size={18} />
            <h3 className="font-bold uppercase text-xs tracking-widest">
              Segurança
            </h3>
          </div>
          <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Nova Senha
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all focus:shadow-[0_0_0_2px_var(--color-secondary)]"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 font-bold transition-all focus:shadow-[0_0_0_2px_var(--color-secondary)]"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--text-on-secondary)",
              }}
            >
              {updatingPassword ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Check size={18} /> Atualizar Senha
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* Pix Modal */}
      {pixData && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-2 text-center">Pagamento via PIX</h2>
            <p className="text-slate-400 text-xs text-center mb-6">Escaneie o código abaixo para ativar o Premium. <span className="block text-amber-500 font-bold">Este código expira em 30 minutos.</span></p>

            <div className="bg-slate-50 p-4 rounded-3xl flex justify-center mb-6">
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code" className="w-48 h-48" />
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Pix (Copia e Cola)</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixData.qr_code}
                  className="flex-1 p-3 bg-slate-50 border-none rounded-xl text-[10px] font-mono text-slate-500 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(pixData.qr_code)}
                  className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setPixData(null)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              Concluído
            </button>
          </div>
        </div>
      )}

      {/* Transparent Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 my-8">
             <div className="flex justify-between items-center mb-6">
               <div>
                  <h2 className="text-xl font-black">Dados do Cartão</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {showCardModal === 'card_recurring' ? 'Assinatura Recorrente' : 'Pagamento Único'}
                  </p>
               </div>
               <button onClick={() => setShowCardModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400"><X size={20} /></button>
             </div>

             <form onSubmit={handleProcessCardPayment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Cartão</label>
                  <input
                    type="text" name="cardNumber" value={cardData.cardNumber} onChange={handleCardInputChange}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="0000 0000 0000 0000" required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mês (MM)</label>
                    <input
                      type="text" name="cardExpirationMonth" value={cardData.cardExpirationMonth} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="12" required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano (AA)</label>
                    <input
                      type="text" name="cardExpirationYear" value={cardData.cardExpirationYear} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="28" required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CVC</label>
                    <input
                      type="text" name="securityCode" value={cardData.securityCode} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all text-center"
                      placeholder="123" required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text" name="identificationNumber" value={cardData.identificationNumber} onChange={handleCardInputChange}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                      placeholder="000.000.000-00" required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome no Cartão</label>
                  <input
                    type="text" name="cardholderName" value={cardData.cardholderName} onChange={handleCardInputChange}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    placeholder="JOAO A SILVA" required
                  />
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-800">
                   <AlertCircle size={18} className="shrink-0" />
                   <p className="text-[10px] font-medium leading-relaxed">
                     Seus dados são criptografados pelo SDK do Mercado Pago. Esta é uma implementação de Checkout Transparente.
                   </p>
                </div>

                <button
                  type="submit"
                  disabled={!!creatingPayment}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                  {creatingPayment ? <Loader2 className="animate-spin" /> : <>Finalizar Pagamento</>}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Camera size={20} style={{ color: "var(--color-primary)" }} />
              Atualizar Foto
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <ImageIcon size={24} />
                  <span className="text-[8px] font-black uppercase">Galeria</span>
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all"
                >
                  <Camera size={24} />
                  <span className="text-[8px] font-black uppercase">Câmera</span>
                </button>
              </div>

              {uploadingAvatar && (
                <div className="flex items-center justify-center py-4 text-slate-400 gap-2 text-xs font-bold">
                  <Loader2 className="animate-spin" size={16} /> Processando...
                </div>
              )}

              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUploadAvatar} />
              <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleUploadAvatar} />

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAvatarModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AdBanner isPremium={isPremium} />

      {/* Footer Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-around items-center z-50">
        <Link
          to="/inicio"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <Dumbbell size={24} />
          <span className="text-[10px] font-bold uppercase">Treinos</span>
        </Link>
        <Link
          to="/historico"
          className="text-slate-400 hover:opacity-80 flex flex-col items-center gap-1"
        >
          <HistoryIcon size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </Link>
        <Link
          to="/perfil"
          className="flex flex-col items-center gap-1"
          style={{ color: "var(--color-primary-safe)" }}
        >
          <User size={24} />
          <span className="text-[10px] font-bold uppercase">Perfil</span>
        </Link>
      </nav>
    </div>
  );
};

export default Profile;
