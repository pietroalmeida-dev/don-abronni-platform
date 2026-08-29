'use strict';

const { Schema, model } = require('mongoose');

// DECISÃO DE MODELAGEM: coleção SEPARADA (referenciando funcionario), não um array
// embutido dentro de Funcionario. Motivo: este é exatamente o caso em que embutir
// seria um erro clássico de modelagem em MongoDB — um funcionário pode acumular
// centenas de registros de diária ao longo dos anos (um "array não limitado", que
// cresce para sempre). Documentos no MongoDB têm um limite de 16MB, e mesmo bem
// antes disso, arrays não limitados dentro de um documento prejudicam a performance
// de leitura (todo o histórico é carregado junto mesmo quando só queremos os dados
// básicos do funcionário). Quando o padrão de acesso é "log/histórico que só cresce
// e raramente precisamos de tudo de uma vez", referenciar é a escolha certa.
const FuncionarioDiariaSchema = new Schema(
  {
    funcionario: { type: Schema.Types.ObjectId, ref: 'Funcionario', required: true },
    data: { type: Date, required: true },
    valor: { type: Number, required: true, min: 0 },
    observacao: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

FuncionarioDiariaSchema.index({ funcionario: 1, data: -1 });

module.exports = model('FuncionarioDiaria', FuncionarioDiariaSchema);
