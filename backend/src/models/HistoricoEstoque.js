'use strict';

const { Schema, model } = require('mongoose');

// Mesma lógica de FuncionarioDiaria: um log que só cresce ao longo do tempo é um
// caso de referência, não de embutir dentro de Ingrediente.
const HistoricoEstoqueSchema = new Schema(
  {
    ingrediente: { type: Schema.Types.ObjectId, ref: 'Ingrediente', required: true },
    tipoMovimento: { type: String, enum: ['entrada', 'saida', 'ajuste'], required: true },
    quantidade: { type: Number, required: true },
    motivo: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

HistoricoEstoqueSchema.index({ ingrediente: 1, createdAt: -1 });

module.exports = model('HistoricoEstoque', HistoricoEstoqueSchema);
