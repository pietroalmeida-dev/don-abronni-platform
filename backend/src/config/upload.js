'use strict';

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

// Mapa fechado mimetype → extensão de gravação. Não usamos a extensão que o
// cliente mandou em originalname (é só uma string, spoofável) nem confiamos só no
// mimetype (também é declarado pelo próprio cliente) — a defesa aqui é aceitar só
// esses 3 mimetypes E gravar sempre com a extensão correspondente do nosso mapa,
// nunca a que veio no arquivo. SVG foi removido de propósito: é um formato que pode
// conter <script>, e como /uploads é servido como arquivo estático, um SVG
// malicioso viraria XSS armazenado para quem abrisse a imagem direto no navegador.
const EXTENSAO_POR_MIMETYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Armazena os arquivos em disco, em src/uploads, com um nome único (timestamp +
// número aleatório) para nunca sobrescrever um arquivo já enviado por engano.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const sufixoUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extensao = EXTENSAO_POR_MIMETYPE[file.mimetype] || '';
    cb(null, `${sufixoUnico}${extensao}`);
  },
});

// Aceita apenas imagens, e limita o tamanho — sem isso, qualquer pessoa poderia
// mandar um arquivo de qualquer tipo/tamanho para o servidor.
function filtroDeArquivo(req, file, cb) {
  if (!EXTENSAO_POR_MIMETYPE[file.mimetype]) {
    return cb(new AppError('Formato de imagem não suportado. Use JPG, PNG ou WEBP.', 422));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: filtroDeArquivo,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
