'use strict';

const router = require('express').Router();
const freteController = require('../controllers/freteController');
const { limitadorPublico } = require('../middlewares/rateLimiters');
const validar = require('../middlewares/validar');
const { calcularValidacao } = require('../validations/freteValidations');

// POST /api/frete/calcular — Tela: Checkout, passo "Entrega" (ao sair do campo CEP).
// Pública (sem login, é chamada antes do cliente se identificar) — só o rate limit
// por IP protege contra automação, já que não há como reconhecer "quem" está
// pedindo.
router.post('/calcular', limitadorPublico, calcularValidacao, validar, freteController.calcular);

module.exports = router;
