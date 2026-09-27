'use strict';

const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');

const paymentController = {
  criar: asyncHandler(async (req, res) => {
    const { numeroNota } = req.body;
    const dados = await paymentService.criarPagamento({ numeroNota, usuario: req.usuario });
    res.status(201).json(dados);
  }),

  // O Mercado Pago manda o id do recurso na query string (?data.id=...&type=payment)
  // e a assinatura em cabeçalhos — nunca no corpo — então validar a assinatura não
  // depende do corpo bruto da requisição, só de query + headers.
  webhook: asyncHandler(async (req, res) => {
    await paymentService.processarWebhook({
      dataId: req.query['data.id'] || req.body?.data?.id,
      tipo: req.query.type || req.body?.type,
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
    });
    // Sempre 200, mesmo quando a notificação foi ignorada (tipo desconhecido,
    // pedido não encontrado) — um erro aqui faz o Mercado Pago reenviar a mesma
    // notificação repetidamente, sem nenhum benefício.
    res.status(200).json({ recebido: true });
  }),
};

module.exports = paymentController;
