'use strict';

const funcionarioService = require('../services/funcionarioService');
const asyncHandler = require('../utils/asyncHandler');

const funcionarioController = {
  listar: asyncHandler(async (req, res) => {
    res.status(200).json(await funcionarioService.listarTodos());
  }),
  criar: asyncHandler(async (req, res) => {
    res.status(201).json(await funcionarioService.criar(req.body));
  }),
  atualizar: asyncHandler(async (req, res) => {
    res.status(200).json(await funcionarioService.atualizar(req.params.id, req.body));
  }),
  demitir: asyncHandler(async (req, res) => {
    res.status(200).json(await funcionarioService.demitir(req.params.id));
  }),
};

module.exports = funcionarioController;
