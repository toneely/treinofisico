import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const routeTitles = {
  '/': 'Dashboard',
  '/login': 'Entrar',
  '/admin': 'Painel Administrativo',
  '/configuracoes': 'Configurações',
  '/historico': 'Histórico',
  '/perfil': 'Meu Perfil',
  '/treino': 'Sessão Ativa'
};

export const useDynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const baseTitle = 'Treino Físico';
    let pageTitle = '';

    // Handle dynamic training routes
    if (location.pathname.startsWith('/treino/')) {
        pageTitle = routeTitles['/treino'];
    } else {
        pageTitle = routeTitles[location.pathname] || '';
    }

    document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle;
  }, [location]);
};
