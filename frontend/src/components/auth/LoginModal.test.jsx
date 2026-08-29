import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginModal from './LoginModal';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { UIProvider, useUI } from '../../contexts/UIContext';
import { authService } from '../../services/authService';

// Mocka o módulo inteiro do service: AuthProvider chama getSession()/getAdminSession()
// ao montar (não deve encontrar nada aqui — testes começam deslogados), e é
// `esqueciSenha` quem o teste realmente quer observar sendo chamado.
vi.mock('../../services/authService', () => ({
  authService: {
    getSession: vi.fn(() => null),
    getAdminSession: vi.fn(() => null),
    esqueciSenha: vi.fn(),
  },
}));

// LoginModal só renderiza seu conteúdo quando isLoginModalOpen (UIContext) é
// true — este componente auxiliar abre o modal já na aba de login, usando o hook
// de verdade, do mesmo jeito que qualquer botão "Entrar" da aplicação faria.
function AbrirModal() {
  const { openLoginModal } = useUI();
  return <button onClick={() => openLoginModal('login')}>abrir modal (setup)</button>;
}

function renderLoginModal() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <UIProvider>
            <AbrirModal />
            <LoginModal />
          </UIProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('LoginModal — fluxo "Esqueceu a senha?"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function abrirTelaDeRecuperacao(user) {
    await user.click(screen.getByRole('button', { name: /abrir modal \(setup\)/i }));
    await user.click(screen.getByText('Esqueceu a senha?'));
  }

  it('clicar em "Esqueceu a senha?" troca a tela de login pelo formulário de recuperação', async () => {
    const user = userEvent.setup();
    renderLoginModal();

    await abrirTelaDeRecuperacao(user);

    expect(screen.getByRole('heading', { name: /recuperar senha/i })).toBeInTheDocument();
    // As abas Login/Cadastrar somem nessa sub-tela — só a seta "Voltar" leva de volta.
    expect(screen.queryByRole('button', { name: 'Login' })).not.toBeInTheDocument();
  });

  it('envia o e-mail digitado e mostra a confirmação, sem revelar se a conta existe', async () => {
    authService.esqueciSenha.mockResolvedValue({ ok: true, mensagem: 'Se esse e-mail estiver cadastrado, enviamos um link.' });
    const user = userEvent.setup();
    renderLoginModal();

    await abrirTelaDeRecuperacao(user);
    // .active só alterna visibilidade por CSS — as três <form> continuam todas no
    // DOM ao mesmo tempo (login, cadastro e recuperação têm campo de e-mail com o
    // mesmo placeholder), então a busca precisa ficar restrita à ativa.
    const formularioAtivo = within(document.querySelector('.modal-form.active'));
    await user.type(formularioAtivo.getByPlaceholderText('Seu e-mail'), 'pietro@teste.com');
    await user.click(formularioAtivo.getByRole('button', { name: /enviar link de recuperação/i }));

    expect(authService.esqueciSenha).toHaveBeenCalledWith('pietro@teste.com');
    expect(await screen.findByText(/verifique sua caixa de entrada/i)).toBeInTheDocument();
  });

  it('o botão "Voltar" retorna para a tela de login normal', async () => {
    const user = userEvent.setup();
    renderLoginModal();

    await abrirTelaDeRecuperacao(user);
    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  // Regressão de um bug real encontrado testando manualmente no navegador:
  // LoginModal é montado uma única vez quando o site carrega (o ModalOverlay só
  // esconde/mostra o CONTEÚDO por dentro, nunca desmonta LoginModal em si) — sem o
  // useEffect que reseta forgotEnviado/forgotEmail ao fechar, a tela de "e-mail
  // enviado" ficava travada pra sempre depois do primeiro envio, mesmo reabrindo o
  // modal numa "sessão" nova de uso. Um teste que só faz um único render() nunca
  // pegaria isso (cada `it` já começa numa árvore nova) — por isso este teste
  // fecha e reabre o modal de propósito, na mesma instância montada.
  it('depois de enviar com sucesso, fechar e reabrir o modal mostra o formulário de novo (não fica travado na tela de sucesso)', async () => {
    authService.esqueciSenha.mockResolvedValue({ ok: true, mensagem: 'Se esse e-mail estiver cadastrado, enviamos um link.' });
    const user = userEvent.setup();
    renderLoginModal();

    await abrirTelaDeRecuperacao(user);
    const formularioAtivo = within(document.querySelector('.modal-form.active'));
    await user.type(formularioAtivo.getByPlaceholderText('Seu e-mail'), 'pietro@teste.com');
    await user.click(formularioAtivo.getByRole('button', { name: /enviar link de recuperação/i }));
    expect(await screen.findByText(/verifique sua caixa de entrada/i)).toBeInTheDocument();

    // Fecha o modal (botão "Fechar", o X do ModalOverlay) e abre de novo.
    await user.click(screen.getByRole('button', { name: /fechar/i }));
    await abrirTelaDeRecuperacao(user);

    // Precisa mostrar o campo de e-mail de novo, não a mensagem de sucesso antiga.
    // (dois campos "Seu e-mail" existem no DOM ao mesmo tempo — login e recuperação
    // — por isso a busca fica restrita à sub-tela ativa, igual nos testes acima.)
    expect(within(document.querySelector('.modal-form.active')).getByPlaceholderText('Seu e-mail')).toBeInTheDocument();
    expect(screen.queryByText(/verifique sua caixa de entrada/i)).not.toBeInTheDocument();
  });
});
