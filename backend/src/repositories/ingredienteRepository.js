'use strict';

const { Ingrediente, HistoricoEstoque } = require('../models');

const ingredienteRepository = {
  async listarTodos() {
    return Ingrediente.find().sort({ nome: 1 }).limit(500);
  },
  async criar(dados) {
    return Ingrediente.create(dados);
  },
  async buscarPorId(id) {
    return Ingrediente.findById(id);
  },
  async atualizar(id, dados) {
    // runValidators: sem isso, o Mongoose não valida required/min/max do schema em
    // updates — permitiria gravar, por exemplo, quantidade negativa de estoque.
    return Ingrediente.findByIdAndUpdate(id, dados, { returnDocument: 'after', runValidators: true });
  },
  // Update atômico: soma `delta` e nunca deixa o resultado negativo, tudo numa
  // única operação no banco (update em formato de pipeline agregação). Evita a
  // corrida de "ler → somar em JS → salvar" que dois ajustes concorrentes no mesmo
  // ingrediente podiam perder uma das atualizações (lost update).
  async ajustarQuantidade(id, delta) {
    return Ingrediente.findByIdAndUpdate(
      id,
      [{ $set: { quantidade: { $max: [0, { $add: ['$quantidade', delta] }] } } }],
      { returnDocument: 'after' }
    );
  },
  async registrarMovimento({ ingredienteId, tipoMovimento, quantidade, motivo }) {
    return HistoricoEstoque.create({ ingrediente: ingredienteId, tipoMovimento, quantidade, motivo });
  },
};

module.exports = ingredienteRepository;
