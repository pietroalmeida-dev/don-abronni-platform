'use strict';

const { Schema, model } = require('mongoose');

const VendaSchema = new Schema(
  {
    pedido: { type: Schema.Types.ObjectId, ref: 'Pedido', default: null }, // pode ser uma venda manual, sem pedido do site
    valor: { type: Number, required: true },
    descricao: { type: String, trim: true, default: '' },
    data: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model('Venda', VendaSchema);
