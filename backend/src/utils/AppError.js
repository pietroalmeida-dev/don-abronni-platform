'use strict';

// Erro "operacional" — algo previsível (validação, não encontrado, não autorizado),
// diferente de um bug de programação. O middleware de tratamento de erros usa isso
// para decidir o que responder ao cliente e o que só logar internamente.
class AppError extends Error {
  constructor(message, statusCode = 400, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
