import { api } from './apiClient';
import { STORAGE_KEYS, lerJSON, salvarJSON } from './storage';

// O backend devolve { id, nome, email, role }. Os componentes (LoginModal,
// CheckoutModal, OrderHistoryModal...) já esperam `session.name` (não `nome`) desde
// a versão local — normaliza aqui pra não precisar mudar nenhum componente. O token
// JWT vai junto dentro do objeto de sessão: é o único jeito dos outros services
// saberem qual token usar em cada chamada autenticada.
function paraSessao(usuario, token) {
  return { id: usuario.id, name: usuario.nome, email: usuario.email, telefone: usuario.telefone || '', role: usuario.role, token };
}

export const authService = {
  getSession() {
    return lerJSON(STORAGE_KEYS.SESSION, null);
  },

  getAdminSession() {
    return lerJSON(STORAGE_KEYS.ADMIN_SESSION, null);
  },

  async register({ nome, email, senha }) {
    try {
      const resultado = await api.post('/auth/registrar', { nome, email, senha });
      // Igual ao comportamento antigo: registrar não loga automaticamente — o
      // LoginModal manda o usuário pra aba de login depois do cadastro.
      return { ok: true, usuario: paraSessao(resultado.usuario, resultado.token) };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  // Login genérico — funciona tanto para cliente quanto para admin (o backend não
  // distingue, o `role` é que vem na resposta). Salva no par de chaves certo
  // (SESSION ou ADMIN_SESSION) conforme o role devolvido. Quem chama (AuthContext)
  // decide o que fazer com base em `resultado.usuario.role` — é UMA única chamada de
  // rede, mesmo quando o front ainda não sabe se é cliente ou admin (ver LoginModal:
  // antes tentava adminLogin() e, se falhasse, tentava login() de novo — duas
  // requisições HTTP idênticas pra cada tentativa de login).
  async login({ email, senha }) {
    try {
      const resultado = await api.post('/auth/login', { email, senha });
      const sessao = paraSessao(resultado.usuario, resultado.token);
      salvarJSON(sessao.role === 'admin' ? STORAGE_KEYS.ADMIN_SESSION : STORAGE_KEYS.SESSION, sessao);
      return { ok: true, usuario: sessao };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return Promise.resolve({ ok: true });
  },

  // Login estritamente admin — usado só pelo formulário de login DENTRO do painel
  // administrativo (AdminLoginForm), onde uma conta de cliente comum deve ser
  // recusada ("Credenciais incorretas."), nunca logada como cliente por engano. O
  // login "genérico" acima (usado pelo modal do site) já resolve sozinho pra qual
  // sessão vai; este aqui existe só para essa tela específica, que não faz sentido
  // aceitar nada que não seja admin.
  async adminLogin({ email, senha }) {
    try {
      const resultado = await api.post('/auth/login', { email, senha });
      if (resultado.usuario.role !== 'admin') {
        return { ok: false, erro: 'Credenciais incorretas.' };
      }
      const sessao = paraSessao(resultado.usuario, resultado.token);
      salvarJSON(STORAGE_KEYS.ADMIN_SESSION, sessao);
      return { ok: true };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  adminLogout() {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    return Promise.resolve({ ok: true });
  },

  // Edita nome/telefone da conta logada. Atualiza a sessão salva localmente com o
  // mesmo token (trocar o nome não invalida a sessão) — assim a tela não precisa
  // pedir login de novo só porque o nome mudou.
  async updateProfile({ nome, telefone }) {
    try {
      const sessaoAtual = lerJSON(STORAGE_KEYS.SESSION, null);
      const resultado = await api.patch('/auth/me', { nome, telefone }, sessaoAtual?.token);
      const sessao = paraSessao(resultado, sessaoAtual?.token);
      salvarJSON(STORAGE_KEYS.SESSION, sessao);
      return { ok: true, usuario: sessao };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  async changePassword({ senhaAtual, novaSenha }) {
    try {
      const sessaoAtual = lerJSON(STORAGE_KEYS.SESSION, null);
      await api.patch('/auth/me/senha', { senhaAtual, novaSenha }, sessaoAtual?.token);
      return { ok: true };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  // Tela: LoginModal, "Esqueceu a senha?". Não muda estado de sessão nenhum (por
  // isso não passa pelo AuthContext, igual a addressesService/ordersService) — só
  // dispara o e-mail. A resposta do backend já vem com a mesma mensagem genérica
  // esteja o e-mail cadastrado ou não (ver authService.js do backend).
  async esqueciSenha(email) {
    try {
      const resultado = await api.post('/auth/esqueci-senha', { email });
      return { ok: true, mensagem: resultado.mensagem };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },

  // Tela: RedefinirSenhaPage (rota /redefinir-senha?token=...), aberta a partir do
  // link recebido por e-mail.
  async redefinirSenha({ token, novaSenha }) {
    try {
      await api.post('/auth/redefinir-senha', { token, novaSenha });
      return { ok: true };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },
};
