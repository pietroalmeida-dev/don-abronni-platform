'use strict';

const bcrypt = require('bcrypt');

// 🚨 Cria o PRIMEIRO usuário administrador, com a senha vinda de ADMIN_SEED_PASSWORD
// no .env, sempre criptografada com bcrypt antes de tocar o banco — nunca em texto puro.
async function seedAdmin(Usuario) {
  const existente = await Usuario.findOne({ role: 'admin' });
  if (existente) {
    console.log('[seed] admin: já existe, pulando.');
    return;
  }

  // Antes caía num fallback silencioso ('dono123') se ADMIN_SEED_PASSWORD não
  // estivesse setada — criava o admin de produção com senha fraca e previsível sem
  // avisar ninguém. Agora falha o seed em vez de continuar.
  const senha = process.env.ADMIN_SEED_PASSWORD;
  if (!senha || senha === 'troque_esta_senha' || senha.length < 6) {
    throw new Error(
      'ADMIN_SEED_PASSWORD não definida (ou é o valor de exemplo/curta demais) no .env — defina uma senha forte antes de rodar o seed.'
    );
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  await Usuario.create({
    nome: process.env.ADMIN_SEED_NAME || 'Administrador',
    email: (process.env.ADMIN_SEED_EMAIL || 'admin@donabronni.com').toLowerCase(),
    senhaHash,
    role: 'admin',
  });
  console.log('[seed] admin: criado.');
}

module.exports = seedAdmin;
