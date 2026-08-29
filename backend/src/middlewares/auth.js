'use strict';

const { verificarToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { Usuario } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// Lê o token do cabeçalho "Authorization: Bearer <token>", valida a assinatura e
// carrega o usuário correspondente em `req.usuario` — os controllers/services nunca
// precisam saber COMO o usuário foi autenticado, só que `req.usuario` já existe.
const autenticar = asyncHandler(async (req, res, next) => {
  const cabecalho = req.headers.authorization;
  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    throw new AppError('Não autenticado. Faça login para continuar.', 401);
  }

  const token = cabecalho.split(' ')[1];
  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    throw new AppError('Sessão expirada ou inválida. Faça login novamente.', 401);
  }

  const usuario = await Usuario.findById(payload.id);
  if (!usuario) {
    throw new AppError('Usuário não encontrado. Faça login novamente.', 401);
  }

  req.usuario = usuario;
  next();
});

// Middleware de autorização por papel — uso: autorizar('admin') depois de autenticar.
// Separado de `autenticar` de propósito: autenticação ("quem é você?") e autorização
// ("você pode fazer isso?") são responsabilidades diferentes, e nem toda rota
// autenticada exige um papel específico.
function autorizar(...papeisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !papeisPermitidos.includes(req.usuario.role)) {
      throw new AppError('Você não tem permissão para acessar este recurso.', 403);
    }
    next();
  };
}

module.exports = { autenticar, autorizar };
