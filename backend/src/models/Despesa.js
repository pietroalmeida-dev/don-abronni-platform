'use strict';

const { Schema, model } = require('mongoose');

const DespesaSchema = new Schema(
  {
    descricao: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    valor: { type: Number, required: true },
    data: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model('Despesa', DespesaSchema);
