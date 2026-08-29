'use strict';

const router = require('express').Router();
const catalogoController = require('../controllers/catalogoController');
const { autenticar, autorizar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const { criarValidacao, atualizarValidacao } = require('../validations/catalogoValidations');
const upload = require('../config/upload');

// GET /api/produtos — Tela: MenuSection (cardápio completo e destaques)
// GET /api/produtos?categoria=pizza_salgada — filtro por categoria
router.get('/', catalogoController.listar);

// GET /api/produtos/destaques — Tela: seção "Mais Pedidas" da Home
router.get('/destaques', catalogoController.destaques);

// GET /api/produtos/sabores — Tela: seletor de sabores do modal "Dois Sabores"
router.get('/sabores', catalogoController.sabores);

// POST /api/produtos/upload-imagem — Tela: painel admin (cadastro/edição de produto,
// upload da foto). `upload.single('imagem')` processa um único arquivo enviado no
// campo de formulário chamado "imagem"; o resultado fica em req.file.
router.post(
  '/upload-imagem',
  autenticar,
  autorizar('admin'),
  upload.single('imagem'),
  catalogoController.uploadImagem
);

// POST /api/produtos — Tela: painel admin, modal "Novo Produto"
router.post('/', autenticar, autorizar('admin'), criarValidacao, validar, catalogoController.criar);

// PUT /api/produtos/:id — Tela: painel admin, modal "Editar Produto"
router.put('/:id', autenticar, autorizar('admin'), atualizarValidacao, validar, catalogoController.atualizar);

// DELETE /api/produtos/:id — Tela: painel admin, botão "Remover" (soft-delete:
// marca ativo:false, nunca apaga — ver produtoRepository.desativar)
router.delete('/:id', autenticar, autorizar('admin'), catalogoController.desativar);

module.exports = router;
