'use strict';

const router = require('express').Router();
const paymentController = require('../controllers/paymentController');
const { limitadorPublico } = require('../middlewares/rateLimiters');

// POST /api/webhooks/pagamento — chamado pelo Mercado Pago, nunca pelo nosso
// próprio front-end. Fica FORA de `autenticar` de propósito: o gateway não tem (e
// não pode ter) um token JWT de um usuário nosso. A segurança desta rota vem
// inteiramente da validação de assinatura feita dentro de
// paymentService.processarWebhook, não de autenticação — daí a rota pública, mas
// ainda assim limitada por IP (rateLimiters) contra flood.
router.post('/pagamento', limitadorPublico, paymentController.webhook);

module.exports = router;
