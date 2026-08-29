'use strict';

const crypto = require('crypto');

// 🚨 PROVISÓRIO: gera um "QR code" fictício (na prática, um texto aleatório) em vez
// de chamar um gateway de pagamento real. Isolado num service para que a troca por
// um gateway de verdade (Mercado Pago, PagSeguro, Efí, etc.) seja só trocar o corpo
// desta função — os controllers/rotas que a chamam não precisam mudar.
const paymentService = {
  async criarPagamentoPix(valor) {
    const chaveFicticia = crypto.randomBytes(16).toString('hex');
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    return {
      valor,
      qrCode: `00020126PIX-FICTICIO-${chaveFicticia}5204000053039865802BR`,
      status: 'aguardando',
      expiraEm,
    };
  },
};

module.exports = paymentService;
