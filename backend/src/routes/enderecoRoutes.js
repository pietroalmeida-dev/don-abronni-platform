'use strict';

const router = require('express').Router();
const enderecoController = require('../controllers/enderecoController');
const { autenticar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { adicionarValidacao, atualizarValidacao } = require('../validations/enderecoValidations');

// GET /api/enderecos — Tela: Checkout (passo "Entrega") e "Meus Endereços" no menu
// do usuário — a mesma lista de endereços salvos serve os dois lugares.
router.get('/', autenticar, enderecoController.listarMeus);

// POST /api/enderecos — Tela: Checkout e "Meus Endereços", ao salvar um endereço novo
router.post('/', autenticar, adicionarValidacao, validar, enderecoController.adicionar);

// PUT /api/enderecos/:id — Tela: "Meus Endereços", editar um endereço salvo
router.put('/:id', autenticar, atualizarValidacao, validar, enderecoController.atualizar);

// DELETE /api/enderecos/:id — Tela: "Meus Endereços", remover um endereço salvo
router.delete('/:id', autenticar, enderecoController.remover);

module.exports = router;
