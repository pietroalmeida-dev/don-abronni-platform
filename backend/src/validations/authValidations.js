'use strict';

const { body } = require('express-validator');

const registrarValidacao = [
  body('nome').trim().notEmpty().withMessage('Digite seu nome completo.'),
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').isLength({ min: 6 }).withMessage('Senha: mínimo 6 caracteres.'),
];

const loginValidacao = [
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').notEmpty().withMessage('Digite sua senha.'),
];

// PATCH /api/auth/me — nunca inclui `email`/`role` de propósito: essa rota só edita
// o que é seguro o cliente mudar sozinho, sem re-verificação extra.
const atualizarPerfilValidacao = [
  body('nome').trim().notEmpty().withMessage('Digite seu nome completo.'),
  body('telefone').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Telefone inválido.'),
];

// PATCH /api/auth/me/senha
const alterarSenhaValidacao = [
  body('senhaAtual').notEmpty().withMessage('Digite sua senha atual.'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha: mínimo 6 caracteres.'),
];

// POST /api/auth/esqueci-senha
const esqueciSenhaValidacao = [
  body('email').isEmail().withMessage('E-mail inválido.'),
];

// POST /api/auth/redefinir-senha
const redefinirSenhaValidacao = [
  body('token').trim().notEmpty().withMessage('Token de recuperação ausente.'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha: mínimo 6 caracteres.'),
];

module.exports = {
  registrarValidacao,
  loginValidacao,
  atualizarPerfilValidacao,
  alterarSenhaValidacao,
  esqueciSenhaValidacao,
  redefinirSenhaValidacao,
};
