'use strict';

const router = require('express').Router();
const whatsappController = require('../controllers/whatsappController');
const { limitadorPublico } = require('../middlewares/rateLimiters');

// POST /api/whatsapp-inscritos — Tela: seção "Participe do nosso WhatsApp" da Home.
// Pública e grava no banco — sem rate limit, um script poderia inundar a lista de
// inscritos com registros falsos indefinidamente.
router.post('/', limitadorPublico, whatsappController.inscrever);

module.exports = router;
