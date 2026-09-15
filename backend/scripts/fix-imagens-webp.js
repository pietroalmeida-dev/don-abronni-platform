'use strict';

// Migração pontual (rodar 1x): o commit "comprime e converte imagens do cardápio
// para webp" atualizou os arquivos em public/imagens-pizzas/ e o seed
// (produtos.json) para .webp, mas o banco do Atlas já tinha os produtos gravados
// com a extensão antiga (.png/.jpg) — nunca foi re-seedado. Este script corrige o
// campo `imagem` de cada Produto pra apontar pro arquivo .webp que já existe em
// disco, sem tocar em mais nada do documento (preço, estoque, pedidos etc).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const Produto = require('../src/models/Produto');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'frontend', 'public');

async function main() {
  await connectDatabase();
  const produtos = await Produto.find({ imagem: /\.(png|jpe?g)$/i });

  let corrigidos = 0;
  let semCorrespondencia = [];

  for (const produto of produtos) {
    const webpPath = produto.imagem.replace(/\.(png|jpe?g)$/i, '.webp');
    const fullPath = path.join(PUBLIC_DIR, webpPath.replace(/^\//, ''));

    if (fs.existsSync(fullPath)) {
      produto.imagem = webpPath;
      await produto.save();
      corrigidos++;
    } else {
      semCorrespondencia.push(produto.nome);
    }
  }

  console.log(`Corrigidos: ${corrigidos}`);
  if (semCorrespondencia.length) {
    console.log('Sem arquivo .webp correspondente (verificar manualmente):', semCorrespondencia);
  }

  await disconnectDatabase();
}

main().catch((erro) => {
  console.error('Falha na migração:', erro);
  process.exit(1);
});
