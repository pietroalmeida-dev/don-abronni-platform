'use strict';

const avaliacaoService = require('../services/avaliacaoService');
const asyncHandler = require('../utils/asyncHandler');

const avaliacaoController = {
  criar: asyncHandler(async (req, res) => {
    const { numeroNota, nota, comentario } = req.body;
    const avaliacao = await avaliacaoService.criar({ usuario: req.usuario, numeroNota, nota, comentario });
    res.status(201).json(avaliacao);
  }),

  listarTodas: asyncHandler(async (req, res) => {
    res.status(200).json(await avaliacaoService.listarTodas());
  }),

  listarMinhas: asyncHandler(async (req, res) => {
    res.status(200).json(await avaliacaoService.listarMinhas(req.usuario._id));
  }),

  listarPublicas: asyncHandler(async (req, res) => {
    res.status(200).json(await avaliacaoService.listarPublicas());
  }),
};

module.exports = avaliacaoController;
