'use strict';

const router = require('express').Router();
const usuarioController = require('../controllers/usuarioController');
const { autenticar, autorizar } = require('../middlewares/auth');

// GET /api/usuarios — Tela: painel admin, seção "Clientes"
router.get('/', autenticar, autorizar('admin'), usuarioController.listarComEstatisticas);

module.exports = router;
