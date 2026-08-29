'use strict';

require('dotenv').config();

const app = require('./src/app');
const { connectDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3001;

// Falha cedo e de forma clara se a configuração essencial estiver ausente/fraca, em
// vez de deixar o servidor subir "quase funcionando":
// - FRONTEND_URL ausente faria o middleware `cors` (src/app.js) liberar '*'
//   silenciosamente, em vez de restringir a origem — um buraco de segurança
//   silencioso em produção.
// - JWT_SECRET ausente ou deixado no valor de exemplo do .env.example tornaria os
//   tokens de sessão forjáveis por qualquer um que leia o repositório público.
function validarConfiguracaoEssencial() {
  const erros = [];

  if (!process.env.FRONTEND_URL) {
    erros.push('FRONTEND_URL não definida — sem ela, o CORS libera qualquer origem (*).');
  }

  const segredoExemplo = 'troque_este_segredo_por_uma_string_longa_e_aleatoria';
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === segredoExemplo) {
    erros.push('JWT_SECRET não definido ou ainda é o valor de exemplo do .env.example.');
  } else if (process.env.JWT_SECRET.length < 32) {
    erros.push('JWT_SECRET muito curto (use uma string aleatória de 32+ caracteres).');
  }

  if (erros.length > 0) {
    console.error('[Servidor] Configuração inválida em .env:');
    erros.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// Diferente de validarConfiguracaoEssencial(), isto NUNCA derruba o servidor —
// e-mail ausente não é um buraco de segurança (ao contrário de FRONTEND_URL/
// JWT_SECRET), é só uma funcionalidade que fica indisponível. O problema real que
// isto resolve: sem este aviso, "esqueci minha senha" sem EMAIL_USER/
// EMAIL_APP_PASSWORD configurados falha de um jeito TOTALMENTE silencioso — a API
// sempre responde sucesso de propósito (anti-enumeração de e-mail, ver
// authService.solicitarRecuperacaoSenha), então nada no fluxo normal do sistema
// avisa que o e-mail nunca saiu. Isso já aconteceu uma vez neste projeto e só foi
// percebido porque o cliente reportou não ter recebido o e-mail — este aviso
// existe pra próxima vez que faltar, aparecer na hora, no terminal, em vez de
// exigir investigação depois.
function avisarConfiguracaoOpcional() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Servidor] ⚠ EMAIL_USER/EMAIL_APP_PASSWORD não configurados — "Esqueci minha senha" não vai conseguir enviar e-mails (a API responde sucesso normalmente, mas nenhum e-mail sai). Ver .env.example.');
  }
}

async function iniciar() {
  validarConfiguracaoEssencial();
  avisarConfiguracaoOpcional();

  try {
    await connectDatabase();
    console.log('[MongoDB] Conectado com sucesso.');

    app.listen(PORT, () => {
      console.log(`[Servidor] Rodando em http://localhost:${PORT}`);
    });
  } catch (erro) {
    console.error('[Servidor] Falha ao iniciar:', erro.message);
    process.exit(1);
  }
}

iniciar();
