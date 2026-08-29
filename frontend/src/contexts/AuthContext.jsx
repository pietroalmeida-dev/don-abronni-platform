import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession());
  const [adminSession, setAdminSession] = useState(() => authService.getAdminSession());
  const showToast = useToast();

  // Login genérico (usado pelo modal do site): uma única chamada de rede resolve
  // sozinha se é cliente ou admin (authService.login já persiste no par de chaves
  // certo) — só refletimos isso no estado React de acordo com o `role` devolvido.
  const login = useCallback(async (credenciais) => {
    const resultado = await authService.login(credenciais);
    if (resultado.ok) {
      if (resultado.usuario.role === 'admin') setAdminSession(resultado.usuario);
      else setSession(resultado.usuario);
    }
    return resultado;
  }, []);

  const register = useCallback(async (dados) => authService.register(dados), []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const adminLogin = useCallback(async (credenciais) => {
    const resultado = await authService.adminLogin(credenciais);
    if (resultado.ok) setAdminSession(authService.getAdminSession());
    return resultado;
  }, []);

  const adminLogout = useCallback(() => {
    authService.adminLogout();
    setAdminSession(null);
  }, []);

  // Atualiza a sessão em memória com o nome/telefone novos assim que o backend
  // confirma — sem isso, a tela precisaria recarregar a página pra refletir a
  // mudança em qualquer lugar que exiba `session.name` (ex.: Navbar).
  const updateProfile = useCallback(async (dados) => {
    const resultado = await authService.updateProfile(dados);
    if (resultado.ok) setSession(resultado.usuario);
    return resultado;
  }, []);

  const changePassword = useCallback(async (dados) => authService.changePassword(dados), []);

  // Reage a qualquer chamada autenticada que volte 401 (token expirado/inválido —
  // ver apiClient.js, que só dispara este evento pra chamadas que JÁ mandavam um
  // token, nunca em login/registro). Sem isso, uma sessão "zumbi" continuava
  // marcada como logada na UI enquanto todo carregamento de dados autenticado
  // falhava silenciosamente (painel admin, "Meus pedidos", endereços do checkout
  // ficavam presos em loading pra sempre, sem nenhuma explicação pro usuário).
  useEffect(() => {
    function aoPerderAutorizacao(evento) {
      const tokenRejeitado = evento.detail?.token;
      if (session?.token && session.token === tokenRejeitado) {
        authService.logout();
        setSession(null);
        showToast('Sua sessão expirou. Faça login novamente.', 'erro');
      }
      if (adminSession?.token && adminSession.token === tokenRejeitado) {
        authService.adminLogout();
        setAdminSession(null);
        showToast('Sua sessão de administrador expirou. Faça login novamente.', 'erro');
      }
    }
    window.addEventListener('auth:unauthorized', aoPerderAutorizacao);
    return () => window.removeEventListener('auth:unauthorized', aoPerderAutorizacao);
  }, [session, adminSession, showToast]);

  // useMemo: sem isso, todo componente que consome useAuth() (Navbar, CheckoutModal,
  // AdminDashboardPage...) re-renderizaria a cada render do AuthProvider, mesmo sem
  // nenhum dado que ele usa ter mudado de fato.
  const value = useMemo(
    () => ({ session, adminSession, login, register, logout, adminLogin, adminLogout, updateProfile, changePassword }),
    [session, adminSession, login, register, logout, adminLogin, adminLogout, updateProfile, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  return ctx;
}
