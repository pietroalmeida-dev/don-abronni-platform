'use strict';

const dns = require('dns');
const mongoose = require('mongoose');

// Algumas redes (certas operadoras/roteadores) bloqueiam consultas DNS do tipo SRV,
// que é o que o driver do Mongo usa pra resolver "mongodb+srv://" (Atlas). Sem isso,
// a conexão falha com "querySrv ECONNREFUSED" mesmo com a connection string e o IP
// liberado corretos — só nessas redes. Servidores públicos (Google/Cloudflare)
// resolvem SRV normalmente, então force-los aqui evita o problema sem exigir que
// cada dev configure o DNS do sistema operacional.
if (process.env.MONGO_URI?.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

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
