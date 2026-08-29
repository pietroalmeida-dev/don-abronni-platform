'use strict';

const produtoRepository = require('../repositories/produtoRepository');
const AppError = require('../utils/AppError');

function formatarProduto(produto) {
  return {
    id: produto._id,
    nome: produto.nome,
    descricao: produto.descricao,
    imagem: produto.imagem,
    precoBase: produto.precoBase,
    categoria: produto.categoria,
    destaque: produto.destaque,
    permiteDoisSabores: produto.permiteDoisSabores,
    permiteBordaRecheada: produto.permiteBordaRecheada,
    tamanhos: produto.tamanhos.map((t) => ({ id: t._id, nome: t.nome, precoAdicional: t.precoAdicional })),
  };
}

const catalogService = {
  async listarTodos() {
    const produtos = await produtoRepository.listarTodos();
    return produtos.map(formatarProduto);
  },
  async listarPorCategoria(categoria) {
    const produtos = await produtoRepository.listarPorCategoria(categoria);
    return produtos.map(formatarProduto);
  },
  async listarDestaques() {
    const produtos = await produtoRepository.listarDestaques();
    return produtos.map(formatarProduto);
  },
  async listarSabores() {
    const produtos = await produtoRepository.listarNomesQuePermitemDoisSabores();
    return produtos.map((p) => p.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  // A partir daqui: CRUD de produto, usado só pelo painel admin (ver
  // catalogoRoutes.js — autenticar + autorizar('admin')). Reaproveita
  // formatarProduto() pra devolver sempre o mesmo formato que o catálogo público já
  // usa, em vez de vazar campos internos (ex.: `ingredientes`, `__v`).
  async criar(dados) {
    const produto = await produtoRepository.criar(dados);
    return formatarProduto(produto);
  },

  async atualizar(id, dados) {
    const produto = await produtoRepository.atualizar(id, dados);
    if (!produto) throw new AppError('Produto não encontrado.', 404);
    return formatarProduto(produto);
  },

  async desativar(id) {
    const produto = await produtoRepository.desativar(id);
    if (!produto) throw new AppError('Produto não encontrado.', 404);
    return formatarProduto(produto);
  },
};

module.exports = catalogService;
