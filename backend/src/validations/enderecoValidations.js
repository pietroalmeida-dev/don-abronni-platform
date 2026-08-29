'use strict';

const { body } = require('express-validator');

// POST /api/enderecos — cep continua tendo uma checagem de negócio própria dentro de
// enderecoService (cepValido), mantida de propósito como uma segunda camada — aqui
// só garantimos o formato básico antes disso.
const adicionarValidacao = [
  body('rua').trim().notEmpty().withMessage('Rua é obrigatória.'),
  body('numero').trim().notEmpty().withMessage('Número é obrigatório.'),
  body('bairro').trim().notEmpty().withMessage('Bairro é obrigatório.'),
  body('cep').trim().notEmpty().withMessage('CEP é obrigatório.'),
];

// PUT /api/enderecos/:id — o front sempre manda o objeto completo (mesmo padrão de
// estoque/funcionário/produto), então reaproveita a mesma validação da criação.
const atualizarValidacao = adicionarValidacao;

module.exports = { adicionarValidacao, atualizarValidacao };
