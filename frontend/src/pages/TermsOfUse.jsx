import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from "../supabaseClient";

const TermsOfUse = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTerms() {
      try {
        const { data, error } = await supabase
          .from("config_app")
          .select("termos_de_uso, subscription_price")
          .single();

        if (error) throw error;

        let rawContent = (data.termos_de_uso || "Conteúdo não disponível.").replace(/\\n/g, '\n');
        const price = data.subscription_price || 0;
        const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

        const finalContent = rawContent.replace(/{{VALOR_ASSINATURA}}/g, formattedPrice);
        setContent(finalContent);
      } catch (err) {
        console.error("Error fetching terms of use:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTerms();
  }, []);

  return (
    <div
      className="min-h-screen p-8 md:p-20"
      style={{
        backgroundImage: "url('/assets/bg-landing.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0a0a0a"
      }}
    >
      <div className="max-w-3xl mx-auto bg-black/40 backdrop-blur-xl p-8 md:p-12 rounded-[40px] border border-white/10 shadow-2xl">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white font-bold mb-10 transition-colors">
          <ArrowLeft size={20} /> Voltar para Home
        </Link>

        <h1 className="text-4xl font-black text-white mb-8 tracking-tight">Termos de Uso</h1>

        <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({node, ...props}) => <h2 className="text-2xl font-black text-white mt-10 mb-4" {...props} />,
                p: ({node, ...props}) => <p className="mb-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 space-y-2 mb-4" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          )}

          <p className="pt-10 text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
