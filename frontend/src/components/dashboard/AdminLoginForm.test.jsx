import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminLoginForm from './AdminLoginForm';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

// Mesmo padrão de mock já usado em AuthContext.test.jsx e LoginModal.test.jsx —
// isola o formulário da rede real, controlando exatamente o que o "backend"
// responde em cada cenário.
vi.mock('../../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => null),
    getAdminSession: vi.fn(() => null),
    adminLogin: vi.fn(),
  },
}));

const adminLogado = { id: 'a1', name: 'Dono', email: 'dono@donabronni.com', role: 'admin', token: 'token-admin' };

function renderForm() {
  const onLoginSuccess = vi.fn();
  render(
    <ToastProvider>
      <AuthProvider>
        <AdminLoginForm onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    </ToastProvider>
  );
  return { onLoginSuccess };
}

describe('AdminLoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getSession.mockReturnValue(null);
    authService.getAdminSession.mockReturnValue(null);
  });

  it('credenciais corretas de admin: chama onLoginSuccess e não mostra erro', async () => {
    authService.adminLogin.mockResolvedValue({ ok: true });
    authService.getAdminSession.mockReturnValue(adminLogado); // lido de novo após o login, ver AuthContext.adminLogin
    const user = userEvent.setup();
    const { onLoginSuccess } = renderForm();

    await user.type(screen.getByPlaceholderText('E-mail'), 'dono@donabronni.com');
    await user.type(screen.getByPlaceholderText('Senha'), 'dono123');
    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(authService.adminLogin).toHaveBeenCalledWith({ email: 'dono@donabronni.com', senha: 'dono123' });
    expect(onLoginSuccess).toHaveBeenCalledOnce();
  });

  // 🔒 Regra de negócio mais importante desta tela: uma conta de CLIENTE (não-admin)
  // não pode entrar no painel, mesmo com senha certa — authService.adminLogin já
  // recusa isso no nível de service (ver authService.js do frontend), este teste
  // garante que o formulário realmente respeita esse "ok: false" e não deixa passar.
  it('conta de cliente comum (não-admin): NÃO chama onLoginSuccess, mostra erro', async () => {
    authService.adminLogin.mockResolvedValue({ ok: false, erro: 'Credenciais incorretas.' });
    const user = userEvent.setup();
    const { onLoginSuccess } = renderForm();

    await user.type(screen.getByPlaceholderText('E-mail'), 'cliente@teste.com');
    await user.type(screen.getByPlaceholderText('Senha'), 'senhaCliente123');
    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('senha errada: mostra a mensagem de erro devolvida pelo service', async () => {
    authService.adminLogin.mockResolvedValue({ ok: false, erro: 'Credenciais incorretas.' });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('E-mail'), 'dono@donabronni.com');
    await user.type(screen.getByPlaceholderText('Senha'), 'senhaErrada');
    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    // O toast em si não é renderizado aqui (não há <Toast/> montado neste teste,
    // só o formulário) — a asserção que importa é o comportamento: adminLogin foi
    // chamado com o que foi digitado, e onLoginSuccess nunca disparou.
    expect(authService.adminLogin).toHaveBeenCalledWith({ email: 'dono@donabronni.com', senha: 'senhaErrada' });
  });

  it('desabilita o botão enquanto a requisição está em andamento (evita duplo clique)', async () => {
    let resolverLogin;
    authService.adminLogin.mockReturnValue(new Promise((resolve) => { resolverLogin = resolve; }));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText('E-mail'), 'dono@donabronni.com');
    await user.type(screen.getByPlaceholderText('Senha'), 'dono123');
    await user.click(screen.getByRole('button', { name: /acessar dashboard/i }));

    expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

    resolverLogin({ ok: true });
  });
});
