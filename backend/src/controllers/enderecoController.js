'use strict';

const enderecoService = require('../services/enderecoService');
const asyncHandler = require('../utils/asyncHandler');

const enderecoController = {
  listarMeus: asyncHandler(async (req, res) => {
    const enderecos = await enderecoService.listarPorUsuario(req.usuario._id);
    res.status(200).json(enderecos);
  }),

  adicionar: asyncHandler(async (req, res) => {
    const enderecos = await enderecoService.adicionar(req.usuario._id, req.body);
    res.status(201).json(enderecos);
  }),

  atualizar: asyncHandler(async (req, res) => {
    const enderecos = await enderecoService.atualizar(req.usuario._id, req.params.id, req.body);
    res.status(200).json(enderecos);
  }),

  remover: asyncHandler(async (req, res) => {
    const enderecos = await enderecoService.remover(req.usuario._id, req.params.id);
    res.status(200).json(enderecos);
  }),
};

module.exports = enderecoController;
