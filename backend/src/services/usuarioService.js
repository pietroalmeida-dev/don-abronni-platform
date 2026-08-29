'use strict';

const usuarioRepository = require('../repositories/usuarioRepository');
const pedidoRepository = require('../repositories/pedidoRepository');

const usuarioService = {
  // Usado pela tela "Clientes" do painel administrativo. Em vez de buscar todos os
  // usuários e, para cada um, fazer uma consulta separada de pedidos (um problema
  // clássico de performance chamado "N+1 queries"), usamos uma única agregação do
  // MongoDB que já calcula tudo de uma vez — acesso a dados sempre via repository,
  // nunca direto no model, mesmo padrão do resto do projeto.
  async listarComEstatisticas() {
    const [clientes, mapaEstatisticas] = await Promise.all([
      usuarioRepository.listarClientes(),
      pedidoRepository.agregarEstatisticasPorUsuario(),
    ]);

    return clientes.map((u) => {
      const stats = mapaEstatisticas.get(String(u._id));
      return {
        id: u._id,
        nome: u.nome,
        email: u.email,
        totalPedidos: stats ? stats.totalPedidos : 0,
        totalGasto: stats ? stats.totalGasto : 0,
        ultimaCompra: stats ? stats.ultimaCompra : null,
      };
    });
  },
};

module.exports = usuarioService;
