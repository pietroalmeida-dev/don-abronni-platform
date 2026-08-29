'use strict';

const estoqueService = require('../services/estoqueService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const estoqueController = {
  listar: asyncHandler(async (req, res) => {
    res.status(200).json(await estoqueService.listarTodos());
  }),
  criar: asyncHandler(async (req, res) => {
    res.status(201).json(await estoqueService.criar(req.body));
  }),
  atualizar: asyncHandler(async (req, res) => {
    res.status(200).json(await estoqueService.atualizar(req.params.id, req.body));
  }),
  ajustar: asyncHandler(async (req, res) => {
    const { delta, motivo } = req.body;
    const deltaNumero = Number(delta);
    // Sem essa checagem, delta ausente/inválido vira NaN e propaga até o .save()
    // do Mongoose, que rejeita com CastError — um 500 sem explicação para o cliente.
    if (!Number.isFinite(deltaNumero)) {
      throw new AppError('delta é obrigatório e precisa ser um número.', 422);
    }
    res.status(200).json(await estoqueService.ajustarQuantidade(req.params.id, deltaNumero, motivo));
  }),
};

module.exports = estoqueController;
