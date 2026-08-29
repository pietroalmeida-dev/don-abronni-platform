import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RedefinirSenhaPage from './RedefinirSenhaPage';
import { ToastProvider } from '../contexts/ToastContext';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => ({
  authService: { redefinirSenha: vi.fn() },
}));

// Monta a página numa rota de memória com um `?token=...` na URL, exatamente como
// ela é acessada de verdade (clicando no link recebido por e-mail) — em vez de
// passar o token como prop, o que não testaria a leitura real da query string.
function renderComToken(token) {
  const rota = token ? `/redefinir-senha?token=${token}` : '/redefinir-senha';
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('RedefinirSenhaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token na URL, mostra aviso de link inválido e não exibe o formulário', () => {
    renderComToken(null);

    expect(screen.getByText(/link inválido/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/nova senha/i)).not.toBeInTheDocument();
  });

  it('com token na URL, mostra o formulário de nova senha', () => {
    renderComToken('abc123');
    expect(screen.getByRole('button', { name: /redefinir senha/i })).toBeInTheDocument();
  });

  it('bloqueia o envio se as duas senhas digitadas forem diferentes', async () => {
    const user = userEvent.setup();
    renderComToken('abc123');

    await user.type(screen.getByPlaceholderText('Nova senha (mínimo 6 caracteres)'), 'senha123');
    await user.type(screen.getByPlaceholderText('Confirmar nova senha'), 'senhaDiferente');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(authService.redefinirSenha).not.toHaveBeenCalled();
  });

  it('com senhas iguais, chama a API com o token da URL e mostra a mensagem de sucesso', async () => {
    authService.redefinirSenha.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderComToken('token-valido-123');

    await user.type(screen.getByPlaceholderText('Nova senha (mínimo 6 caracteres)'), 'senhaNova123');
    await user.type(screen.getByPlaceholderText('Confirmar nova senha'), 'senhaNova123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    expect(authService.redefinirSenha).toHaveBeenCalledWith({ token: 'token-valido-123', novaSenha: 'senhaNova123' });
    expect(await screen.findByText(/redefinida com sucesso/i)).toBeInTheDocument();
  });

  it('token inválido/expirado: mostra o erro do backend e mantém o formulário na tela', async () => {
    authService.redefinirSenha.mockResolvedValue({ ok: false, erro: 'Link inválido ou expirado. Solicite a recuperação de senha novamente.' });
    const user = userEvent.setup();
    renderComToken('token-expirado');

    await user.type(screen.getByPlaceholderText('Nova senha (mínimo 6 caracteres)'), 'senhaNova123');
    await user.type(screen.getByPlaceholderText('Confirmar nova senha'), 'senhaNova123');
    await user.click(screen.getByRole('button', { name: /redefinir senha/i }));

    // Continua mostrando o formulário (não a mensagem de sucesso) — o usuário
    // precisa poder solicitar um novo link, não ficar preso numa tela de "sucesso"
    // que não aconteceu de verdade.
    expect(await screen.findByRole('button', { name: /redefinir senha/i })).toBeInTheDocument();
    expect(screen.queryByText(/redefinida com sucesso/i)).not.toBeInTheDocument();
  });
});
