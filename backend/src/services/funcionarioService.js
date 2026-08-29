'use strict';

const funcionarioRepository = require('../repositories/funcionarioRepository');
const AppError = require('../utils/AppError');

const funcionarioService = {
  async listarTodos() {
    return funcionarioRepository.listarTodos();
  },
  async criar(dados) {
    return funcionarioRepository.criar(dados);
  },
  async atualizar(id, dados) {
    const funcionario = await funcionarioRepository.atualizar(id, dados);
    if (!funcionario) throw new AppError('Funcionário não encontrado.', 404);
    return funcionario;
  },
  async demitir(id) {
    const funcionario = await funcionarioRepository.demitir(id);
    if (!funcionario) throw new AppError('Funcionário não encontrado.', 404);
    return funcionario;
  },
};

module.exports = funcionarioService;
