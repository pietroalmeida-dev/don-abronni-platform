'use strict';

const { body } = require('express-validator');

// POST /api/produtos — criação: campos essenciais obrigatórios.
const criarValidacao = [
  body('nome').trim().notEmpty().withMessage('Nome do produto é obrigatório.'),
  body('descricao').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Descrição muito longa (máx. 500 caracteres).'),
  body('imagem').optional({ values: 'falsy' }).trim(),
  body('precoBase').isFloat({ min: 0 }).withMessage('Preço precisa ser um número maior ou igual a 0.'),
  body('categoria').isIn(['pizza_salgada', 'pizza_doce', 'bebida']).withMessage('Categoria inválida.'),
  body('permiteDoisSabores').optional().isBoolean().withMessage('permiteDoisSabores precisa ser verdadeiro/falso.'),
  body('permiteBordaRecheada').optional().isBoolean().withMessage('permiteBordaRecheada precisa ser verdadeiro/falso.'),
  body('destaque').optional().isBoolean().withMessage('destaque precisa ser verdadeiro/falso.'),
];

// PUT /api/produtos/:id — o front sempre manda o objeto completo (mesmo padrão de
// estoque/funcionário), então os campos continuam obrigatórios aqui.
const atualizarValidacao = criarValidacao;

module.exports = { criarValidacao, atualizarValidacao };
