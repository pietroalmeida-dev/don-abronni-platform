'use strict';

const router = require('express').Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { limitadorAuth } = require('../middlewares/rateLimiters');
const {
  registrarValidacao,
  loginValidacao,
  atualizarPerfilValidacao,
  alterarSenhaValidacao,
  esqueciSenhaValidacao,
  redefinirSenhaValidacao,
} = require('../validations/authValidations');

// POST /api/auth/registrar — Tela: modal de Login/Cadastro (aba "Cadastrar")
router.post('/registrar', limitadorAuth, registrarValidacao, validar, authController.registrar);

// POST /api/auth/login — Tela: modal de Login/Cadastro (aba "Login"). Funciona tanto
// para clientes quanto para o administrador — o token retornado já carrega o `role`,
// e é o front-end que decide para onde navegar com base nisso.
router.post('/login', limitadorAuth, loginValidacao, validar, authController.login);

// GET /api/auth/me — usado para restaurar a sessão ao recarregar a página
router.get('/me', autenticar, authController.me);

// PATCH /api/auth/me — Tela: "Meu Perfil", editar nome/telefone
router.patch('/me', autenticar, atualizarPerfilValidacao, validar, authController.atualizarPerfil);

// PATCH /api/auth/me/senha — Tela: "Meu Perfil", trocar senha. Mesmo rate limit do
// login: sem isso, seria possível tentar adivinhar a senha atual por força bruta
// usando um token JWT válido (ex.: roubado de uma sessão).
router.patch('/me/senha', limitadorAuth, autenticar, alterarSenhaValidacao, validar, authController.alterarSenha);

// POST /api/auth/esqueci-senha — Tela: LoginModal, "Esqueceu a senha?". Mesmo
// limitador de login: sem rate limit, essa rota vira uma forma de spammar a caixa
// de entrada de qualquer pessoa (basta mandar o e-mail dela repetidamente).
router.post('/esqueci-senha', limitadorAuth, esqueciSenhaValidacao, validar, authController.esqueciSenha);

// POST /api/auth/redefinir-senha — Tela: RedefinirSenhaPage (link recebido por
// e-mail). Também sob rate limit: sem isso, o token de 256 bits continua
// inviável de adivinhar por força bruta, mas não custa nada ter as duas camadas.
router.post('/redefinir-senha', limitadorAuth, redefinirSenhaValidacao, validar, authController.redefinirSenha);

module.exports = router;
