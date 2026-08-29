'use strict';

const { Schema, model } = require('mongoose');

const IngredienteSchema = new Schema(
  {
    // unique: sem isso era possível cadastrar "Muçarela" duas vezes, dividindo o
    // controle de quantidade/alerta de estoque mínimo em dois documentos diferentes.
    nome: { type: String, required: true, trim: true, unique: true },
    categoria: { type: String, required: true, trim: true },
    quantidade: { type: Number, required: true, default: 0, min: 0 },
    unidade: { type: String, required: true, trim: true },
    estoqueMinimo: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = model('Ingrediente', IngredienteSchema);
