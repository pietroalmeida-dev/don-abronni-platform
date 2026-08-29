'use strict';

require('dotenv').config();
const { connectDatabase, disconnectDatabase } = require('../../config/database');
const { Produto, Usuario, Ingrediente, Funcionario } = require('../../models');

const seedProdutos = require('./seedProdutos');
const seedAdmin = require('./seedAdmin');
const seedIngredientes = require('./seedIngredientes');
const seedFuncionarios = require('./seedFuncionarios');

async function rodarSeeders() {
  await connectDatabase();
  console.log('[seed] Conectado ao MongoDB. Iniciando seeds...\n');

  await seedProdutos(Produto);
  await seedAdmin(Usuario);
  await seedIngredientes(Ingrediente);
  await seedFuncionarios(Funcionario);

  console.log('\n[seed] Concluído.');
  await disconnectDatabase();
  process.exit(0);
}

rodarSeeders().catch((erro) => {
  console.error('[seed] Falha:', erro);
  process.exit(1);
});
