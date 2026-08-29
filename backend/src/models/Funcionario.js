'use strict';

const { Schema, model } = require('mongoose');

const FuncionarioSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true },
    cargo: { type: String, required: true, trim: true },
    // unique: evita cadastrar o mesmo funcionário duas vezes por engano. Como
    // "demitir" é soft-delete (ativo:false, nunca remove o documento), o número de
    // um ex-funcionário fica reservado — não pode ser reaproveitado por uma nova
    // contratação enquanto o registro antigo existir; é a troca aceita para manter
    // o histórico de quem já trabalhou lá.
    telefone: { type: String, required: true, trim: true, unique: true },
    salario: { type: Number, required: true, min: 0 },
    dataContratacao: { type: Date, required: true },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model('Funcionario', FuncionarioSchema);
