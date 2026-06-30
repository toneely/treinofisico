import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";
import { LogIn, Mail, Lock, Chrome, Loader2 } from "lucide-react";
import Logo from "../components/ui/Logo";
const Login = () => {
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !authLoading) {
      console.log("Usuário já autenticado, redirecionando...");
      navigate("/inicio");
    }
  }, [user, authLoading, navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Conta criada! Verifique seu e-mail.", "success");
        setIsSignUp(false);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        showToast(error.message, "error");
      } else {
        showToast("Bem-vindo de volta!", "success");
        console.log("Login efetuado, redirecionando para /inicio...");
        window.location.href = "/inicio";
      }
    }
    setLoading(false);
  };
  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) showToast(error.message, "error");
  };
  return (
    <div className="min-h-screen flex items-center justify-center  p-6">
      {" "}
      <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        {" "}
        <div className="text-center mb-8">
          {" "}
          <Logo size="w-20 h-20" className="mx-auto mb-4 rounded-3xl shadow-lg shadow-slate-100" />
          {" "}
          <h1 className="text-2xl font-black ">Treino Físico</h1>{" "}
          <p className="text-slate-500 text-sm">
            Sua jornada para a excelência
          </p>{" "}
        </div>{" "}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-4 px-6 border-2 border-slate-100 rounded-2xl font-bold  flex items-center justify-center gap-3 hover:bg-slate-50 transition-all mb-6"
        >
          {" "}
          <Chrome size={20} className="text-red-500" /> Entrar com Google{" "}
        </button>{" "}
        <div className="relative mb-6">
          {" "}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>{" "}
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">
              ou e-mail
            </span>
          </div>{" "}
        </div>{" "}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {" "}
          <div className="space-y-1">
            {" "}
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
              Seu E-mail
            </label>{" "}
            <div className="relative">
              {" "}
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={18}
              />{" "}
              <input
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none font-bold  outline-none focus:ring-2 transition-all shadow-[0_0_0_0_rgba(0,0,0,0)] focus:shadow-[0_0_0_2px_var(--color-primary)]"
                required
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="space-y-1">
            {" "}
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">
              Senha
            </label>{" "}
            <div className="relative">
              {" "}
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                size={18}
              />{" "}
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none font-bold  outline-none focus:ring-2 transition-all shadow-[0_0_0_0_rgba(0,0,0,0)] focus:shadow-[0_0_0_2px_var(--color-primary)]"
                required
              />{" "}
            </div>{" "}
          </div>{" "}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4  rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 mt-4"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--text-on-primary)",
            }}
          >
            {" "}
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : isSignUp ? (
              "Criar Conta"
            ) : (
              "Entrar na Conta"
            )}{" "}
          </button>{" "}
        </form>{" "}
        <p className="mt-8 text-center text-xs text-slate-400 font-medium">
          {" "}
          {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-bold hover:underline cursor-pointer"
            style={{ color: "var(--color-primary)" }}
          >
            {" "}
            {isSignUp ? "Faça Login" : "Cadastre-se"}{" "}
          </span>{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
};
export default Login;
