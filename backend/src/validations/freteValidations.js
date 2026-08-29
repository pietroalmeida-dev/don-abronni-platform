'use strict';

const { body } = require('express-validator');

// POST /api/frete/calcular — checagem de formato básica (campo presente). A
// validação de negócio (8 dígitos, CEP existe, dentro da área de entrega) continua
// dentro de shippingService, igual ao padrão já usado em enderecoValidations.
const calcularValidacao = [
  body('cep').trim().notEmpty().withMessage('CEP é obrigatório.'),
];

module.exports = { calcularValidacao };
