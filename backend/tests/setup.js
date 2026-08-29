'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Sobe um MongoDB real (só que em memória, descartado ao final) exclusivamente para
// os testes — não usa o banco de desenvolvimento nem o de produção. É a forma
// recomendada de testar um projeto com Mongoose sem depender de um banco externo
// disponível durante o CI/CD.
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI_TEST = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste';
  // Sem isso, FRONTEND_URL fica undefined nos testes: os testes importam src/app.js
  // diretamente (nunca passam por server.js, que é o único lugar que chama
  // `require('dotenv').config()`). Isso sempre foi assim — só nunca tinha quebrado
  // nada visivelmente porque, até a recuperação de senha existir, nenhum código
  // realmente USAVA esse valor de um jeito que uma string "undefined" quebrasse (o
  // CORS só ficava mais permissivo silenciosamente). authService.solicitarRecuperacaoSenha
  // monta uma URL de verdade com ele, e "undefined/redefinir-senha?token=..." não é
  // uma URL válida — por isso passou a ser necessário fixar aqui.
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  const { connectDatabase } = require('../src/config/database');
  await connectDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  // Limpa todas as coleções entre um teste e outro, para que um teste nunca dependa
  // de dados deixados por outro (testes devem ser independentes entre si).
  const colecoes = mongoose.connection.collections;
  await Promise.all(Object.values(colecoes).map((c) => c.deleteMany({})));
});

module.exports = {};
