'use strict';

const { body } = require('express-validator');

// POST /api/estoque — todos os campos são obrigatórios na criação.
const criarValidacao = [
  body('nome').trim().notEmpty().withMessage('Nome do ingrediente é obrigatório.'),
  body('categoria').trim().notEmpty().withMessage('Categoria é obrigatória.'),
  body('quantidade').isFloat({ min: 0 }).withMessage('Quantidade precisa ser um número maior ou igual a 0.'),
  body('unidade').trim().notEmpty().withMessage('Unidade é obrigatória (ex.: kg, L, un).'),
  body('estoqueMinimo').isFloat({ min: 0 }).withMessage('Estoque mínimo precisa ser um número maior ou igual a 0.'),
];

// PUT /api/estoque/:id — o front sempre manda o objeto completo (ver
// stockService.js no front-end), então os campos continuam obrigatórios aqui.
const atualizarValidacao = criarValidacao;

module.exports = { criarValidacao, atualizarValidacao };
