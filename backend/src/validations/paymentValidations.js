'use strict';

const { body } = require('express-validator');

const criarPagamentoValidacao = [
  body('numeroNota').trim().notEmpty().withMessage('numeroNota é obrigatório.'),
];

module.exports = { criarPagamentoValidacao };
