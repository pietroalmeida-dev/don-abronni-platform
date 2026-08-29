'use strict';

const jwt = require('jsonwebtoken');

const ALGORITMO = 'HS256';

function gerarToken(usuario) {
  // O token carrega só o essencial para identificar e autorizar o usuário em cada
  // requisição — nunca a senha (nem o hash), nunca dados sensíveis desnecessários.
  return jwt.sign(
    { id: usuario._id.toString(), role: usuario.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: ALGORITMO }
  );
}

function verificarToken(token) {
  // Restringe explicitamente o algoritmo aceito (defesa em profundidade): a
  // biblioteca já bloqueia `alg:none` por padrão, mas travar em HS256 evita
  // qualquer "confusão de algoritmo" se um dia o segredo virar um par de chaves
  // assimétrico sem que este arquivo seja revisado junto.
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITMO] });
}

module.exports = { gerarToken, verificarToken };
