'use strict';

const mongoose = require('mongoose');

// Centraliza a conexão com o MongoDB. server.js chama connectDatabase() uma única
// vez, na inicialização — nenhum outro arquivo abre sua própria conexão.
async function connectDatabase() {
  const uri = process.env.NODE_ENV === 'test' ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;

  mongoose.set('strictQuery', true); // rejeita campos que não existem no schema em queries — evita erros silenciosos de digitação

  await mongoose.connect(uri);

  mongoose.connection.on('error', (erro) => {
    console.error('[MongoDB] erro de conexão:', erro.message);
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase, mongoose };
