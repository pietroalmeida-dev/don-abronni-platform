'use strict';

const multer = require('multer');

// Traduz erros "esperados" que não são AppError, mas também não são bugs de
// programação — vêm do Mongoose ou do Multer reagindo a um input inválido do
// cliente. Sem isso, cada um desses caia no ramo genérico de 500 lá embaixo,
// escondendo do cliente que o problema era só, por exemplo, um id mal formado.
function traduzirErroConhecido(err) {
  if (err.name === 'ValidationError') {
    // erro de validação do schema do Mongoose (required/min/max/enum etc.)
    const detalhes = Object.values(err.errors).map((e) => e.message);
    return { statusCode: 422, mensagem: 'Dados inválidos.', detalhes };
  }
  if (err.name === 'CastError') {
    // ex.: id inválido no findById, ou valor não-numérico num campo Number
    return { statusCode: 400, mensagem: `Valor inválido para o campo "${err.path}".` };
  }
  if (err.code === 11000) {
    // chave duplicada (índice unique do Mongoose)
    const campo = Object.keys(err.keyPattern || {})[0] || 'campo';
    return { statusCode: 409, mensagem: `Já existe um registro com esse ${campo}.` };
  }
  if (err instanceof multer.MulterError) {
    // ex.: arquivo maior que o limite, campo de upload inesperado
    return { statusCode: 400, mensagem: `Falha no upload: ${err.message}` };
  }
  return null;
}

// Middleware de erro do Express é reconhecido pela assinatura de 4 argumentos — não
// remova nenhum deles, mesmo que `next` não seja usado, ou o Express deixa de
// tratar isto como um error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Erros "operacionais" (AppError) já sabem seu status code e mensagem segura de
  // mostrar ao usuário. Erros conhecidos do Mongoose/Multer são traduzidos para uma
  // resposta 4xx amigável. Qualquer outro erro (bug de programação, falha de conexão
  // com o banco, etc.) é tratado como 500 e tem os detalhes ocultados do cliente —
  // aparecem só no log do servidor, nunca na resposta HTTP.
  const isOperational = err.isOperational === true;
  const traduzido = !isOperational ? traduzirErroConhecido(err) : null;

  const statusCode = isOperational ? err.statusCode : traduzido ? traduzido.statusCode : 500;
  const mensagem = isOperational ? err.message : traduzido ? traduzido.mensagem : 'Erro interno do servidor.';

  if (!isOperational && !traduzido) {
    console.error('[ERRO NÃO TRATADO]', err);
  }

  const resposta = { erro: mensagem };
  if (isOperational && err.details) resposta.detalhes = err.details;
  if (traduzido && traduzido.detalhes) resposta.detalhes = traduzido.detalhes;

  res.status(statusCode).json(resposta);
}

module.exports = errorHandler;
