'use strict';

const usuarioRepository = require('../repositories/usuarioRepository');
const AppError = require('../utils/AppError');
const { cepValido } = require('../utils/cep');

// 🐛 Corrige um bug pré-existente: ao serializar o DOCUMENTO inteiro de um Usuario
// (ex.: dentro de /auth/me), o Mongoose troca `_id` por `id` automaticamente. Mas
// aqui sempre devolvemos só o ARRAY `usuario.enderecos` extraído — nesse caso a
// troca automática não acontece, e cada endereço saía com `_id` cru. Isso nunca
// tinha causado problema porque nenhuma tela usava o id do endereço (o checkout
// seleciona por posição na lista) — até editar/remover, que precisam de um id de
// verdade pra saber qual endereço mirar. Formata explicitamente, no mesmo padrão
// já usado em catalogService.formatarProduto().
function formatarEndereco(endereco) {
  return {
    id: endereco._id,
    rua: endereco.rua,
    numero: endereco.numero,
    bairro: endereco.bairro,
    cep: endereco.cep,
    complemento: endereco.complemento || '',
  };
}

const enderecoService = {
  async listarPorUsuario(usuarioId) {
    const usuario = await usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);
    return usuario.enderecos.map(formatarEndereco);
  },

  async adicionar(usuarioId, dadosEndereco) {
    if (!cepValido(dadosEndereco.cep)) throw new AppError('CEP inválido.', 422);

    const usuarioAtualizado = await usuarioRepository.adicionarEndereco(usuarioId, dadosEndereco);
    if (!usuarioAtualizado) throw new AppError('Usuário não encontrado.', 404);
    return usuarioAtualizado.enderecos.map(formatarEndereco);
  },

  async atualizar(usuarioId, enderecoId, dadosEndereco) {
    if (!cepValido(dadosEndereco.cep)) throw new AppError('CEP inválido.', 422);

    const usuarioAtualizado = await usuarioRepository.atualizarEndereco(usuarioId, enderecoId, dadosEndereco);
    // null aqui cobre dois casos ao mesmo tempo (usuário não existe, ou o endereço
    // não é dele) — mesma resposta genérica pros dois, sem distinguir qual foi.
    if (!usuarioAtualizado) throw new AppError('Endereço não encontrado.', 404);
    return usuarioAtualizado.enderecos.map(formatarEndereco);
  },

  async remover(usuarioId, enderecoId) {
    const usuarioAtualizado = await usuarioRepository.removerEndereco(usuarioId, enderecoId);
    if (!usuarioAtualizado) throw new AppError('Endereço não encontrado.', 404);
    return usuarioAtualizado.enderecos.map(formatarEndereco);
  },
};

module.exports = enderecoService;
