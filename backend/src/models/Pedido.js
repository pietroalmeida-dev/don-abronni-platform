'use strict';

const { Schema, model } = require('mongoose');

// DECISÃO DE MODELAGEM (itens do pedido): EMBUTIDO. Este é o exemplo mais clássico de
// quando embutir é a escolha certa em MongoDB: os itens de um pedido (a) são
// limitados em quantidade (ninguém pede 500 pizzas de uma vez), (b) nunca são
// consultados independentemente do pedido — não existe a pergunta "me dê só os
// itens, sem o resto do pedido" — e (c) precisam ser lidos JUNTO com o pedido toda
// vez (no checkout, no histórico do cliente, no painel admin). Buscar o pedido
// inteiro em uma única operação, sem precisar de um "$lookup" (join) para montar a
// lista de itens, é exatamente o ganho de performance que o MongoDB documentado
// promete quando o modelo é bem pensado.
//
// Os campos `nome` e `precoUnitario` aqui são um SNAPSHOT do produto no momento da
// compra — copiados de propósito, não uma referência viva ao catálogo. Se o preço
// de uma pizza mudar amanhã, os pedidos já feitos não podem mudar de valor
// retroativamente. `produto` ainda referencia o catálogo (para relatórios do tipo
// "quais pizzas venderam mais"), mas pode ser nulo em pedidos manuais com um item
// que não está cadastrado.
const ItemPedidoSchema = new Schema(
  {
    produto: { type: Schema.Types.ObjectId, ref: 'Produto', default: null },
    produtoSabor2: { type: Schema.Types.ObjectId, ref: 'Produto', default: null }, // segundo sabor, só quando tipo = 'meia_meia'
    nome: { type: String, required: true },
    tipo: { type: String, enum: ['unica', 'meia_meia'], default: 'unica' },
    borda: { type: String, enum: ['nenhuma', 'catupiry', 'cheddar', 'chocolate'], default: 'nenhuma' },
    valorBorda: { type: Number, default: 0 },
    precoUnitario: { type: Number, required: true },
    quantidade: { type: Number, required: true, min: 1, default: 1 },
    subtotal: { type: Number, required: true },
  },
  { _id: true, timestamps: false }
);

// DECISÃO DE MODELAGEM (pagamento Pix): EMBUTIDO também — é uma relação 1-para-1,
// pequena, que só existe (e só faz sentido) junto com o pedido específico. Não há
// motivo para uma coleção separada com um "$lookup" para buscar algo que sempre
// pertence a exatamente um pedido.
const PagamentoPixSchema = new Schema(
  {
    valor: { type: Number, required: true },
    qrCode: { type: String, required: true },
    status: { type: String, enum: ['aguardando', 'pago', 'expirado', 'cancelado'], default: 'aguardando' },
    expiraEm: { type: Date, required: true },
  },
  { _id: false, timestamps: false }
);

const PedidoSchema = new Schema(
  {
    numeroNota: { type: String, required: true, unique: true }, // ex.: "DA-20260727-001" — o mesmo identificador que o front-end já chama de "id"
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', default: null }, // nulo em pedidos manuais lançados pelo painel, sem conta de cliente
    clienteNome: { type: String, required: true },
    clienteEmail: { type: String, default: null },

    entrega: {
      tipo: { type: String, enum: ['delivery', 'retirada'], required: true },
      // Igual à decisão tomada na versão relacional: o endereço é copiado para
      // dentro do pedido (não uma referência para o array `enderecos` do usuário),
      // porque um pedido é um registro histórico — se o cliente editar/apagar o
      // endereço salvo depois, o pedido antigo não pode mudar retroativamente.
      endereco: {
        rua: { type: String, default: null },
        numero: { type: String, default: null },
        bairro: { type: String, default: null },
        cep: { type: String, default: null },
        complemento: { type: String, default: null },
      },
      distanciaKm: { type: Number, default: null },
      taxaEntrega: { type: Number, required: true, default: 0 },
    },

    pagamento: {
      forma: { type: String, enum: ['pix', 'cartao', 'dinheiro'], required: true },
      trocoPara: { type: String, default: '' },
      statusPagamento: { type: String, enum: ['pendente', 'pago'], default: 'pendente' },
    },

    pix: { type: PagamentoPixSchema, default: null },

    observacao: { type: String, default: '' },
    itens: { type: [ItemPedidoSchema], required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['recebido', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'],
      default: 'recebido',
    },
    origem: { type: String, enum: ['site', 'admin_manual'], default: 'site' },
  },
  { timestamps: true }
);

PedidoSchema.index({ usuario: 1, createdAt: -1 });
PedidoSchema.index({ status: 1 });

module.exports = model('Pedido', PedidoSchema);
