import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { ToastProvider } from './ToastContext';
import { authService } from '../services/authService';

// Mocka o service inteiro (a "fronteira" com a rede) — o teste não sabe nem
// precisa saber que por baixo existiria um fetch() para a API real. Isolar aqui
// é o que permite testar só a lógica do AuthContext (o que ele FAZ com a
// resposta do login), não o comportamento da rede em si.
vi.mock('../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => null),
    getAdminSession: vi.fn(() => null),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    adminLogin: vi.fn(),
    adminLogout: vi.fn(),
  },
}));

function wrapper({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}

const clienteLogado = { id: 'u1', name: 'Pietro', email: 'pietro@teste.com', role: 'cliente', token: 'token-cliente' };
const adminLogado = { id: 'a1', name: 'Dono', email: 'dono@teste.com', role: 'admin', token: 'token-admin' };

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getSession.mockReturnValue(null);
    authService.getAdminSession.mockReturnValue(null);
  });

  it('começa sem sessão quando não há nada salvo (usuário deslogado)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
    expect(result.current.adminSession).toBeNull();
  });

  it('recupera a sessão salva ao montar (usuário continua logado após dar F5 na página)', () => {
    authService.getSession.mockReturnValue(clienteLogado);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toEqual(clienteLogado);
  });

  it('login com sucesso e role "cliente" preenche session, não adminSession', async () => {
    authService.login.mockResolvedValue({ ok: true, usuario: clienteLogado });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login({ email: 'x', senha: 'y' }); });

    expect(result.current.session).toEqual(clienteLogado);
    expect(result.current.adminSession).toBeNull();
  });

  it('login com sucesso e role "admin" preenche adminSession, não session', async () => {
    authService.login.mockResolvedValue({ ok: true, usuario: adminLogado });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.login({ email: 'x', senha: 'y' }); });

    expect(result.current.adminSession).toEqual(adminLogado);
    expect(result.current.session).toBeNull();
  });

  it('login com falha (senha errada) não altera nenhuma sessão', async () => {
    authService.login.mockResolvedValue({ ok: false, erro: 'Credenciais inválidas.' });
    const { result } = renderHook(() => useAuth(), { wrapper });

    const resultado = await act(async () => result.current.login({ email: 'x', senha: 'errada' }));

    expect(resultado.ok).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('logout limpa a sessão do cliente', async () => {
    authService.getSession.mockReturnValue(clienteLogado);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toEqual(clienteLogado);

    act(() => result.current.logout());

    expect(result.current.session).toBeNull();
    expect(authService.logout).toHaveBeenCalledOnce();
  });

  it('adminLogin recusado (conta de cliente tentando entrar no painel) não seta adminSession', async () => {
    authService.adminLogin.mockResolvedValue({ ok: false, erro: 'Credenciais incorretas.' });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => { await result.current.adminLogin({ email: 'cliente@teste.com', senha: 'y' }); });

    expect(result.current.adminSession).toBeNull();
  });

  it('evento "auth:unauthorized" com o token da sessão atual desloga o cliente automaticamente', () => {
    authService.getSession.mockReturnValue(clienteLogado);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toEqual(clienteLogado);

    // Simula o apiClient detectando um 401 numa chamada autenticada (token expirado
    // no servidor) — é assim, via CustomEvent no window, que apiClient avisa o
    // AuthContext sem precisar de um import circular entre os dois módulos.
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { token: 'token-cliente' } }));
    });

    expect(result.current.session).toBeNull();
  });

  it('evento "auth:unauthorized" com um token DIFERENTE do da sessão atual não desloga ninguém', () => {
    authService.getSession.mockReturnValue(clienteLogado);
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Token de uma sessão antiga/de outra aba, por exemplo — não deve afetar a
    // sessão atual, que continua válida.
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { token: 'token-de-outra-sessao' } }));
    });

    expect(result.current.session).toEqual(clienteLogado);
  });
});
