'use strict';

const router = require('express').Router();
const pedidoController = require('../controllers/pedidoController');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarPedidoValidacao, atualizarStatusValidacao, criarManualValidacao } = require('../validations/pedidoValidations');

// POST /api/pedidos — Tela: Checkout, botão "Confirmar e enviar" (cliente autenticado)
router.post('/', autenticar, criarPedidoValidacao, validar, pedidoController.criar);

// GET /api/pedidos/meus — Tela: modal "Meus pedidos" do cliente
router.get('/meus', autenticar, pedidoController.meus);

// GET /api/pedidos — Tela: painel admin, seção "Pedidos" (todos os pedidos)
router.get('/', autenticar, autorizar('admin'), pedidoController.listarTodos);

// PATCH /api/pedidos/:numeroNota/status — Tela: painel admin, botão "Atualizar" do pedido
router.patch('/:numeroNota/status', autenticar, autorizar('admin'), atualizarStatusValidacao, validar, pedidoController.atualizarStatus);

// PATCH /api/pedidos/:numeroNota/cancelar — Tela: Checkout, tela de Pix, botão
// "Cancelar" — o próprio cliente (autenticado, sem precisar ser admin) cancela um
// pedido que ainda é dele e ainda está 'recebido'.
router.patch('/:numeroNota/cancelar', autenticar, pedidoController.cancelar);

// POST /api/pedidos/manual — Tela: painel admin, botão "Novo Pedido" (telefone/balcão)
router.post('/manual', autenticar, autorizar('admin'), criarManualValidacao, validar, pedidoController.criarManual);

module.exports = router;
