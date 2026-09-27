'use strict';

const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const { autenticar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarPagamentoValidacao } = require('../validations/paymentValidations');

// POST /api/pagamentos — Tela: Checkout, tela de Pix / redirecionamento de cartão.
// Etapa SEPARADA da criação do pedido (POST /api/pedidos): o pedido já existe, com
// o total recalculado no servidor, antes de qualquer chamada ao gateway acontecer.
router.post('/', autenticar, criarPagamentoValidacao, validar, paymentController.criar);

module.exports = router;
