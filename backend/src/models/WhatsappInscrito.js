'use strict';

const { Schema, model } = require('mongoose');

const WhatsappInscritoSchema = new Schema(
  {
    nome: { type: String, trim: true, default: '' },
    telefone: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

module.exports = model('WhatsappInscrito', WhatsappInscritoSchema);
