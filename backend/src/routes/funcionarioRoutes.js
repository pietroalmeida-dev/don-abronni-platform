'use strict';

const router = require('express').Router();
const funcionarioController = require('../controllers/funcionarioController');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarValidacao, atualizarValidacao } = require('../validations/funcionarioValidations');

router.use(autenticar, autorizar('admin'));

// GET /api/funcionarios — Tela: painel admin, seção "Funcionários"
router.get('/', funcionarioController.listar);
// POST /api/funcionarios — Tela: painel admin, modal "Contratar Funcionário"
router.post('/', criarValidacao, validar, funcionarioController.criar);
// PUT /api/funcionarios/:id — Tela: painel admin, modal "Editar Funcionário"
router.put('/:id', atualizarValidacao, validar, funcionarioController.atualizar);
// DELETE /api/funcionarios/:id — Tela: painel admin, botão "Demitir"
router.delete('/:id', funcionarioController.demitir);

module.exports = router;
