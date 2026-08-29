'use strict';

const rateLimit = require('express-rate-limit');

// Centraliza os limitadores de taxa do projeto — antes só existia o de auth,
// declarado direto dentro de authRoutes.js. Extrair pra cá permite reaproveitar a
// mesma configuração (e o mesmo cuidado com testes automatizados) em qualquer rota
// pública nova, sem duplicar a lógica de "pular em ambiente de teste" em cada
// arquivo de rota.
function criarLimitador({ limit, mensagem }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    // Em teste (NODE_ENV=test), a própria suíte automatizada bate as rotas dezenas
    // de vezes em segundos — um padrão de tráfego que nenhuma pessoa real geraria,
    // mas que o limitador não sabe diferenciar de abuso. Continua 100% ativo em
    // desenvolvimento e produção.
    skip: () => process.env.NODE_ENV === 'test',
    message: { erro: mensagem },
  });
}

// Login/registro/recuperação de senha: força bruta e credential stuffing são o
// risco real aqui — 20 tentativas/15min é folgado pra um humano que erra a senha,
// mas inviabiliza um ataque automatizado.
const limitadorAuth = criarLimitador({
  limit: 20,
  mensagem: 'Muitas tentativas. Tente novamente em alguns minutos.',
});

// Rotas públicas (sem login) que fazem alguma escrita ou processamento não-trivial
// — hoje: inscrição no WhatsApp (grava no banco) e cálculo de frete. Sem login pra
// identificar quem está pedindo, o único freio possível é por IP. O limite é mais
// folgado que o de auth (60/15min) porque são ações legítimas que um visitante real
// pode repetir várias vezes numa sessão de compra normal (ex.: corrigir o CEP
// digitado errado várias vezes) — o objetivo aqui é barrar automação, não
// atrapalhar uso humano normal.
const limitadorPublico = criarLimitador({
  limit: 60,
  mensagem: 'Muitas requisições. Tente novamente em alguns minutos.',
});

module.exports = { limitadorAuth, limitadorPublico };
