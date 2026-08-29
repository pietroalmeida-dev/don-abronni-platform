'use strict';

const { Produto } = require('../models');

const produtoRepository = {
  async listarTodos() {
    return Produto.find({ ativo: true }).sort({ nome: 1 });
  },
  async listarPorCategoria(categoria) {
    return Produto.find({ categoria, ativo: true }).sort({ nome: 1 });
  },
  async listarDestaques() {
    return Produto.find({ destaque: true, ativo: true });
  },
  async buscarPorId(id) {
    return Produto.findById(id);
  },
  async listarNomesQuePermitemDoisSabores() {
    const produtos = await Produto.find({ permiteDoisSabores: true, ativo: true }, 'nome precoBase').sort({ nome: 1 });
    return produtos;
  },

  async criar(dados) {
    return Produto.create(dados);
  },
  async atualizar(id, dados) {
    // runValidators: mesma razão de todos os outros repositories — sem isso, o
    // Mongoose não valida required/min/enum do schema em updates (ex.: deixaria
    // gravar precoBase negativo ou uma categoria fora do enum).
    return Produto.findByIdAndUpdate(id, dados, { returnDocument: 'after', runValidators: true });
  },
  // "Excluir" um produto é soft-delete (ativo:false), nunca um delete de verdade —
  // mesmo padrão já usado em Funcionario. Um produto desativado pode estar
  // referenciado em pedidos antigos (Pedido.itens[].produto); apagar o documento de
  // verdade quebraria esse histórico.
  async desativar(id) {
    return Produto.findByIdAndUpdate(id, { ativo: false }, { returnDocument: 'after', runValidators: true });
  },
};

module.exports = produtoRepository;
