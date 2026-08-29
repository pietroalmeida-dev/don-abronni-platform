'use strict';

const pedidoService = require('../services/pedidoService');
const asyncHandler = require('../utils/asyncHandler');

const pedidoController = {
  criar: asyncHandler(async (req, res) => {
    const { itens, entrega, pagamento, observacao } = req.body;
    const pedido = await pedidoService.criar({
      usuario: req.usuario,
      itensRequisicao: itens,
      entrega,
      pagamento,
      observacao,
    });
    res.status(201).json(pedido);
  }),

  meus: asyncHandler(async (req, res) => {
    const pedidos = await pedidoService.listarPorUsuario(req.usuario._id);
    res.status(200).json(pedidos);
  }),

  listarTodos: asyncHandler(async (req, res) => {
    const pedidos = await pedidoService.listarTodos();
    res.status(200).json(pedidos);
  }),

  atualizarStatus: asyncHandler(async (req, res) => {
    const { status } = req.body;
    const pedido = await pedidoService.atualizarStatus(req.params.numeroNota, status);
    res.status(200).json(pedido);
  }),

  cancelar: asyncHandler(async (req, res) => {
    const pedido = await pedidoService.cancelarPeloCliente({
      usuario: req.usuario,
      numeroNota: req.params.numeroNota,
    });
    res.status(200).json(pedido);
  }),

  criarManual: asyncHandler(async (req, res) => {
    const { clienteNome, itensTexto, total } = req.body;
    const pedido = await pedidoService.criarManual({ clienteNome, itensTexto, total: parseFloat(total) });
    res.status(201).json(pedido);
  }),
};

module.exports = pedidoController;
