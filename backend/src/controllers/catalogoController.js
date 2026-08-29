'use strict';

const catalogService = require('../services/catalogService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const catalogoController = {
  listar: asyncHandler(async (req, res) => {
    const { categoria } = req.query;
    const produtos = categoria
      ? await catalogService.listarPorCategoria(categoria)
      : await catalogService.listarTodos();
    res.status(200).json(produtos);
  }),

  destaques: asyncHandler(async (req, res) => {
    res.status(200).json(await catalogService.listarDestaques());
  }),

  sabores: asyncHandler(async (req, res) => {
    res.status(200).json(await catalogService.listarSabores());
  }),

  uploadImagem: asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('Nenhum arquivo enviado.', 422);
    // Retorna o caminho público do arquivo — o front-end usa isso como `imagem` ao
    // criar/editar um produto.
    res.status(201).json({ imagem: `/uploads/${req.file.filename}` });
  }),

  criar: asyncHandler(async (req, res) => {
    res.status(201).json(await catalogService.criar(req.body));
  }),

  atualizar: asyncHandler(async (req, res) => {
    res.status(200).json(await catalogService.atualizar(req.params.id, req.body));
  }),

  desativar: asyncHandler(async (req, res) => {
    res.status(200).json(await catalogService.desativar(req.params.id));
  }),
};

module.exports = catalogoController;
