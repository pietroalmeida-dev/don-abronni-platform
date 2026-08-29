'use strict';

const { Avaliacao } = require('../models');

const avaliacaoRepository = {
  async criar(dados) {
    return Avaliacao.create(dados);
  },
  async buscarPorPedido(pedidoId) {
    return Avaliacao.findOne({ pedido: pedidoId });
  },
  async listarTodas() {
    return Avaliacao.find().populate('usuario', 'nome').populate('pedido', 'numeroNota').sort({ createdAt: -1 });
  },
  // Usado pelo histórico do cliente (OrderHistoryModal) pra saber quais dos
  // próprios pedidos já foram avaliados, sem precisar de acesso de admin.
  // `populate('pedido', 'numeroNota')` porque o front-end nunca lida com o
  // ObjectId interno do Mongo — só conhece o pedido pelo `numeroNota` (o mesmo
  // identificador usado em toda a UI, ver comentário no model Pedido).
  async listarPorUsuario(usuarioId) {
    return Avaliacao.find({ usuario: usuarioId }).populate('pedido', 'numeroNota');
  },
  // Usado pela seção "Depoimentos" da home (rota pública, sem login). Só entram
  // avaliações com comentário — nota sozinha, sem texto, não rende um card de
  // depoimento com sentido.
  async listarRecentesComComentario(limite) {
    return Avaliacao.find({ comentario: { $ne: '' } })
      .populate('usuario', 'nome')
      .sort({ createdAt: -1 })
      .limit(limite);
  },
};

module.exports = avaliacaoRepository;
