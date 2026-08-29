'use strict';

// Evita repetir try/catch em cada controller. Qualquer erro (síncrono ou de uma
// Promise rejeitada) dentro de `fn` é automaticamente passado para o Express via
// `next(erro)`, chegando ao middleware de tratamento de erros central.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
