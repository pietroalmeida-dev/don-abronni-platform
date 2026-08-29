'use strict';

const { body } = require('express-validator');

// POST /api/avaliacoes — `nota` também é checada em avaliacaoService (defesa em
// profundidade), mas sem isso aqui um valor não-numérico só seria pego lá na frente
// pelo `required`/`min`/`max` do schema Mongoose, gerando uma mensagem menos clara.
const criarValidacao = [
  body('numeroNota').trim().notEmpty().withMessage('Número da nota é obrigatório.'),
  body('nota').isFloat({ min: 1, max: 5 }).withMessage('A nota deve ser um número entre 1 e 5.'),
  body('comentario').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Comentário muito longo (máx. 500 caracteres).'),
];

module.exports = { criarValidacao };
