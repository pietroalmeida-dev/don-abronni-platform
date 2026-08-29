'use strict';

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Cada rota declara suas regras de validação com express-validator (ver
// src/validations/). Este middleware roda depois delas e centraliza o que acontece
// quando alguma falha — assim nenhum controller precisa checar isso manualmente.
function validar(req, res, next) {
  const resultado = validationResult(req);
  if (!resultado.isEmpty()) {
    const detalhes = resultado.array().map((e) => ({ campo: e.path, mensagem: e.msg }));
    throw new AppError('Dados inválidos.', 422, detalhes);
  }
  next();
}

module.exports = validar;
