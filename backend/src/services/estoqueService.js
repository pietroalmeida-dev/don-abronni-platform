'use strict';

const ingredienteRepository = require('../repositories/ingredienteRepository');
const AppError = require('../utils/AppError');

const estoqueService = {
  async listarTodos() {
    return ingredienteRepository.listarTodos();
  },

  async criar(dados) {
    return ingredienteRepository.criar(dados);
  },

  async atualizar(id, dados) {
    const ingrediente = await ingredienteRepository.atualizar(id, dados);
    if (!ingrediente) throw new AppError('Ingrediente não encontrado.', 404);
    return ingrediente;
  },

  async ajustarQuantidade(id, delta, motivo) {
    const ingrediente = await ingredienteRepository.ajustarQuantidade(id, delta);
    if (!ingrediente) throw new AppError('Ingrediente não encontrado.', 404);

    // Toda alteração de estoque fica registrada — é a tabela/coleção de auditoria
    // que a versão anterior (front-end puro) não tinha.
    await ingredienteRepository.registrarMovimento({
      ingredienteId: ingrediente._id,
      tipoMovimento: delta >= 0 ? 'entrada' : 'saida',
      quantidade: Math.abs(delta),
      motivo: motivo || 'Ajuste manual pelo painel administrativo',
    });

    return ingrediente;
  },
};

module.exports = estoqueService;
