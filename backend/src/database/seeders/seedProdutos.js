'use strict';

// Gerado a partir do mesmo catálogo normalizado usado no front-end React (86
// produtos, sem duplicatas, IDs sequenciais na origem) — fonte única de verdade
// replicada aqui para o seed inicial do banco MongoDB.
const PRODUTOS = require('./dados/produtos.json');

async function seedProdutos(Produto) {
  const existentes = await Produto.countDocuments();
  if (existentes > 0) {
    console.log('[seed] produtos: já existem documentos, pulando.');
    return;
  }
  await Produto.insertMany(PRODUTOS);
  console.log(`[seed] produtos: ${PRODUTOS.length} inseridos.`);
}

module.exports = seedProdutos;
