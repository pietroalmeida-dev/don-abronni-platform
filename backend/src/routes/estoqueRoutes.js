'use strict';

const router = require('express').Router();
const estoqueController = require('../controllers/estoqueController');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarValidacao, atualizarValidacao } = require('../validations/estoqueValidations');

router.use(autenticar, autorizar('admin')); // toda rota de estoque exige admin

// GET /api/estoque — Tela: painel admin, seção "Estoque"
router.get('/', estoqueController.listar);
// POST /api/estoque — Tela: painel admin, modal "Novo Ingrediente"
router.post('/', criarValidacao, validar, estoqueController.criar);
// PUT /api/estoque/:id — Tela: painel admin, modal "Editar Ingrediente"
router.put('/:id', atualizarValidacao, validar, estoqueController.atualizar);
// PATCH /api/estoque/:id/ajuste — Tela: painel admin, modal "Ajustar Estoque"
router.patch('/:id/ajuste', estoqueController.ajustar);

module.exports = router;
