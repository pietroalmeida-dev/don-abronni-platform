'use strict';

const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/produtos', require('./catalogoRoutes'));
router.use('/enderecos', require('./enderecoRoutes'));
router.use('/pedidos', require('./pedidoRoutes'));
router.use('/frete', require('./freteRoutes'));
router.use('/estoque', require('./estoqueRoutes'));
router.use('/funcionarios', require('./funcionarioRoutes'));
router.use('/usuarios', require('./usuarioRoutes'));
router.use('/whatsapp-inscritos', require('./whatsappRoutes'));
router.use('/avaliacoes', require('./avaliacaoRoutes'));

module.exports = router;
