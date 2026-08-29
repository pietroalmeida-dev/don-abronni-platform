'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const usuarioRepository = require('../repositories/usuarioRepository');
const emailService = require('./emailService');
const { gerarToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10; // custo do bcrypt — 10 é o equilíbrio padrão entre segurança e tempo de resposta hoje em dia
const VALIDADE_TOKEN_RECUPERACAO_MS = 60 * 60 * 1000; // 1 hora — janela curta o bastante pra reduzir o risco de um link interceptado ainda ser útil, longa o bastante pra não frustrar quem só demorou pra abrir o e-mail

// Mensagem devolvida em QUALQUER solicitação de recuperação, exista ou não esse
// e-mail no sistema — nunca "e-mail não encontrado". Ver authService.solicitarRecuperacaoSenha.
const MENSAGEM_RECUPERACAO_GENERICA = 'Se esse e-mail estiver cadastrado, enviamos um link de recuperação. Verifique sua caixa de entrada.';

const authService = {
  async registrar({ nome, email, senha, telefone }) {
    const existente = await usuarioRepository.buscarPorEmail(email);
    if (existente) throw new AppError('E-mail já cadastrado. Faça login.', 409);

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuario = await usuarioRepository.criar({
      nome,
      email: email.toLowerCase(),
      senhaHash,
      telefone,
      role: 'cliente', // registro público NUNCA cria admin — só o seed inicial ou uma promoção manual no banco pode
    });

    return montarRespostaAuth(usuario);
  },

  async login({ email, senha }) {
    const usuario = await usuarioRepository.buscarPorEmail(email, { comSenha: true });
    if (!usuario) throw new AppError('E-mail ou senha incorretos.', 401);

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) throw new AppError('E-mail ou senha incorretos.', 401);

    return montarRespostaAuth(usuario);
  },

  // Edita nome/telefone do PRÓPRIO usuário autenticado. Nunca aceita `email` nem
  // `role` no payload — o controller só repassa os dois campos explicitamente (ver
  // authController.atualizarPerfil), então mesmo que alguém tentasse mandar `role`
  // no corpo da requisição, isso nunca chegaria até aqui.
  async atualizarPerfil(usuarioId, { nome, telefone }) {
    const usuario = await usuarioRepository.atualizar(usuarioId, { nome, telefone });
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);
    return formatarPerfil(usuario);
  },

  // 🔒 Exige a senha ATUAL antes de aceitar a nova — sem isso, qualquer pessoa que
  // pegasse um token JWT válido "emprestado" (uma aba esquecida aberta, por
  // exemplo) poderia trocar a senha da conta sem nunca ter sabido a senha original.
  async alterarSenha(usuarioId, { senhaAtual, novaSenha }) {
    const usuario = await usuarioRepository.buscarPorId(usuarioId, { comSenha: true });
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);

    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaCorreta) throw new AppError('Senha atual incorreta.', 401);

    const novaSenhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
    await usuarioRepository.atualizarSenha(usuarioId, novaSenhaHash);
    return { ok: true };
  },

  // Tela: LoginModal, aba "Esqueceu a senha?". Recebe só o e-mail.
  //
  // 🔒 Anti-enumeração: a resposta é SEMPRE a mesma mensagem genérica, exista ou não
  // uma conta com esse e-mail. Sem isso, alguém poderia descobrir quais e-mails têm
  // cadastro só testando um por um nessa rota e reparando qual resposta muda — o
  // mesmo cuidado que outras partes do sistema já tomam (ex.: login nunca diz "e-mail
  // não encontrado" vs "senha errada", sempre "e-mail ou senha incorretos").
  async solicitarRecuperacaoSenha({ email }) {
    const usuario = await usuarioRepository.buscarPorEmail(email);

    if (usuario) {
      // Token de 256 bits (32 bytes) em hexadecimal: entropia alta o bastante pra
      // ser inviável de adivinhar por força bruta, mesmo com a janela de 1h de
      // validade. Só o HASH (SHA-256) dele é gravado no banco — o valor em texto
      // puro existe apenas dentro deste request, tempo suficiente pra ir dentro do
      // link do e-mail e nunca mais precisar existir em lugar nenhum.
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(token);
      const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_RECUPERACAO_MS);

      await usuarioRepository.salvarTokenRecuperacao(usuario._id, tokenHash, expiraEm);

      const link = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;

      // Falha no envio do e-mail (SMTP fora do ar, credencial errada etc.) nunca
      // deve virar um erro 500 pro cliente — isso revelaria "encontramos sua conta,
      // mas algo quebrou", uma informação a mais do que a resposta genérica permite.
      // Fica só no log do servidor, pra quem está desenvolvendo/mantendo perceber.
      try {
        await emailService.enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, link);
      } catch (erro) {
        console.error('[e-mail de recuperação de senha não pôde ser enviado]', erro.message);
      }
    }

    return { ok: true, mensagem: MENSAGEM_RECUPERACAO_GENERICA };
  },

  // Tela: RedefinirSenhaPage (rota pública /redefinir-senha?token=...), acessada a
  // partir do link recebido por e-mail.
  async redefinirSenha({ token, novaSenha }) {
    const tokenHash = hashToken(token);
    const novaSenhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);

    // A troca de senha E a invalidação do token acontecem no MESMO comando atômico
    // (ver usuarioRepository.redefinirSenhaPorToken) — não há uma etapa intermediária
    // onde o token ainda seria válido para uma segunda tentativa.
    const usuario = await usuarioRepository.redefinirSenhaPorToken(tokenHash, novaSenhaHash);
    if (!usuario) {
      throw new AppError('Link inválido ou expirado. Solicite a recuperação de senha novamente.', 400);
    }

    return { ok: true };
  },
};

// SHA-256, não bcrypt: bcrypt existe para proteger senhas curtas/fracas ESCOLHIDAS
// POR HUMANOS, adicionando custo computacional que dificulta força bruta contra um
// espaço pequeno de possibilidades. Um token de 32 bytes aleatórios já tem entropia
// alta o bastante (2^256 possibilidades) para tornar força bruta inviável mesmo com
// um hash "rápido" — aplicar bcrypt aqui só adicionaria custo sem nenhum ganho real
// de segurança.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function montarRespostaAuth(usuario) {
  return {
    usuario: formatarPerfil(usuario),
    token: gerarToken(usuario),
  };
}

// Mesmo formato devolvido em registro, login, /me e agora na edição de perfil —
// um único lugar decide o que do Usuario é seguro expor (nunca senhaHash, nunca
// campos internos do Mongoose).
function formatarPerfil(usuario) {
  return {
    id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone || '',
    role: usuario.role,
  };
}

module.exports = authService;
