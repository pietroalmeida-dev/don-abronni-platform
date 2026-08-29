'use strict';

const { Funcionario } = require('../models');

const funcionarioRepository = {
  async listarTodos() {
    return Funcionario.find({ ativo: true }).sort({ nome: 1 }).limit(500);
  },
  async criar(dados) {
    return Funcionario.create(dados);
  },
  async buscarPorId(id) {
    return Funcionario.findById(id);
  },
  async atualizar(id, dados) {
    // runValidators: sem isso, o Mongoose não valida required/min/max do schema em
    // updates — permitiria gravar, por exemplo, salário negativo.
    return Funcionario.findByIdAndUpdate(id, dados, { returnDocument: 'after', runValidators: true });
  },
  async demitir(id) {
    return Funcionario.findByIdAndUpdate(id, { ativo: false }, { returnDocument: 'after', runValidators: true });
  },
};

module.exports = funcionarioRepository;
