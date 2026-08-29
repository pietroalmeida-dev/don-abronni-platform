'use strict';

const router = require('express').Router();
const avaliacaoController = require('../controllers/avaliacaoController');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarValidacao } = require('../validations/avaliacaoValidations');

// GET /api/avaliacoes/publicas — Tela: seção "Depoimentos" da Home. Pública, sem
// login — só devolve nota/comentário/primeiro nome (ver avaliacaoService.listarPublicas).
router.get('/publicas', avaliacaoController.listarPublicas);

// POST /api/avaliacoes — Tela: histórico do cliente, botão "Avaliar pedido" em
// pedidos com status "entregue"
router.post('/', autenticar, criarValidacao, validar, avaliacaoController.criar);

// GET /api/avaliacoes/minhas — Tela: histórico do cliente, pra saber quais pedidos
// já foram avaliados e esconder o botão "Avaliar" neles.
router.get('/minhas', autenticar, avaliacaoController.listarMinhas);

// GET /api/avaliacoes — Tela: painel admin (nova seção sugerida, ver tutorial)
router.get('/', autenticar, autorizar('admin'), avaliacaoController.listarTodas);

module.exports = router;
