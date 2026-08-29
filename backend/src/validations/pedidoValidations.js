'use strict';

const { body } = require('express-validator');

const criarPedidoValidacao = [
  // max:50 — sem limite, um carrinho artificialmente enorme dispara uma consulta ao
  // catálogo por item (ver pedidoService.montarItem), sem nenhum ganho legítimo:
  // ninguém pede 50+ itens numa pizzaria de verdade.
  body('itens').isArray({ min: 1, max: 50 }).withMessage('O pedido precisa ter entre 1 e 50 itens.'),
  body('itens.*.produtoId').notEmpty().withMessage('Item sem produto informado.'),
  body('itens.*.quantidade').optional().isInt({ min: 1, max: 50 }).withMessage('Quantidade inválida.'),
  body('entrega.tipo').isIn(['delivery', 'retirada']).withMessage('Tipo de entrega inválido.'),
  body('pagamento.forma').isIn(['pix', 'cartao', 'dinheiro']).withMessage('Forma de pagamento inválida.'),
];

const atualizarStatusValidacao = [
  body('status')
    .isIn(['recebido', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'])
    .withMessage('Status inválido.'),
];

// POST /api/pedidos/manual — antes só tinha uma checagem manual dentro do
// controller que deixava passar `itensTexto` não-string (quebrava com 500 dentro do
// service) e `total` negativo.
const criarManualValidacao = [
  body('clienteNome').trim().notEmpty().withMessage('Nome do cliente é obrigatório.'),
  body('itensTexto').trim().notEmpty().withMessage('Informe ao menos um item.'),
  body('total').isFloat({ min: 0.01 }).withMessage('Total precisa ser um número maior que 0.'),
];

module.exports = { criarPedidoValidacao, atualizarStatusValidacao, criarManualValidacao };
