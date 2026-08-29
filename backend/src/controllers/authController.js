'use strict';

const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const authController = {
  registrar: asyncHandler(async (req, res) => {
    const resultado = await authService.registrar(req.body);
    res.status(201).json(resultado);
  }),

  login: asyncHandler(async (req, res) => {
    const resultado = await authService.login(req.body);
    res.status(200).json(resultado);
  }),

  me: asyncHandler(async (req, res) => {
    // req.usuario já foi carregado pelo middleware `autenticar`.
    const { _id, nome, email, telefone, role } = req.usuario;
    res.status(200).json({ id: _id, nome, email, telefone: telefone || '', role });
  }),

  atualizarPerfil: asyncHandler(async (req, res) => {
    const { nome, telefone } = req.body;
    const usuario = await authService.atualizarPerfil(req.usuario._id, { nome, telefone });
    res.status(200).json(usuario);
  }),

  alterarSenha: asyncHandler(async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    await authService.alterarSenha(req.usuario._id, { senhaAtual, novaSenha });
    res.status(200).json({ ok: true });
  }),

  esqueciSenha: asyncHandler(async (req, res) => {
    const resultado = await authService.solicitarRecuperacaoSenha(req.body);
    res.status(200).json(resultado);
  }),

  redefinirSenha: asyncHandler(async (req, res) => {
    const resultado = await authService.redefinirSenha(req.body);
    res.status(200).json(resultado);
  }),
};

module.exports = authController;
