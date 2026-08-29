'use strict';

const { Schema, model } = require('mongoose');

// DECISÃO DE MODELAGEM: coleção separada (referenciando pedido e usuario), não
// embutida dentro de Pedido. Diferente dos itens do pedido, uma avaliação tem um
// padrão de consulta próprio e independente — o painel administrativo precisa listar
// "todas as avaliações com nota baixa", por exemplo, sem carregar o pedido inteiro
// de cada uma. Um índice único em `pedido` garante uma avaliação por pedido, evitando
// tanto duplicidade quanto avaliação anônima (sem pedido vinculado).
const AvaliacaoSchema = new Schema(
  {
    pedido: { type: Schema.Types.ObjectId, ref: 'Pedido', required: true, unique: true },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    nota: { type: Number, required: true, min: 1, max: 5 },
    comentario: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = model('Avaliacao', AvaliacaoSchema);
