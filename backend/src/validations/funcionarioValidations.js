'use strict';

const { body } = require('express-validator');

// POST /api/funcionarios — todos os campos são obrigatórios na criação.
const criarValidacao = [
  body('nome').trim().notEmpty().withMessage('Nome do funcionário é obrigatório.'),
  body('cargo').trim().notEmpty().withMessage('Cargo é obrigatório.'),
  body('telefone').trim().notEmpty().withMessage('Telefone é obrigatório.'),
  body('salario').isFloat({ min: 0 }).withMessage('Salário precisa ser um número maior ou igual a 0.'),
  body('dataContratacao').isISO8601().withMessage('Data de contratação inválida.'),
];

// PUT /api/funcionarios/:id — o front sempre manda o objeto completo (ver
// employeesService.js no front-end), então os campos continuam obrigatórios aqui.
const atualizarValidacao = criarValidacao;

module.exports = { criarValidacao, atualizarValidacao };
