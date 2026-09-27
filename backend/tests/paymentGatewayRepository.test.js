'use strict';

const crypto = require('crypto');
const paymentGatewayRepository = require('../src/repositories/paymentGatewayRepository');

// Teste de unidade puro (sem banco, sem HTTP, sem mock) do algoritmo de assinatura
// do Mercado Pago — a única barreira de segurança da rota de webhook, que não pode
// exigir um token JWT (o gateway não tem um). Constrói a assinatura do mesmo jeito
// que a SDK oficial construiria (ver node_modules/mercadopago/dist/utils/webhook),
// pra garantir que nossa validação aceita uma assinatura genuína e rejeita
// qualquer coisa forjada, alterada ou reenviada tarde demais (replay).
function assinar({ dataId, requestId, ts, secret }) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return crypto.createHmac('sha256', secret).update(manifest).digest('hex');
}

describe('paymentGatewayRepository.validarAssinaturaWebhook', () => {
  const secret = 'segredo-do-webhook-de-teste';
  const dataId = '123456789';
  const requestId = 'req-abc-123';
  // Timestamp "agora" (em segundos) — a validação rejeita, de propósito, uma
  // assinatura genuína velha demais (tolerância de 5 minutos, ver
  // paymentGatewayRepository.js), então os testes não podem usar um valor fixo do
  // passado.
  const ts = String(Math.floor(Date.now() / 1000));

  test('aceita uma assinatura genuína (construída com o mesmo segredo e o mesmo manifest)', () => {
    const v1 = assinar({ dataId, requestId, ts, secret });

    const valido = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    });

    expect(valido).toBe(true);
  });

  test('rejeita quando o segredo usado para calcular não é o mesmo (forjada por alguém sem a chave)', () => {
    const v1 = assinar({ dataId, requestId, ts, secret: 'segredo-errado' });

    const valido = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    });

    expect(valido).toBe(false);
  });

  test('rejeita quando o dataId foi trocado depois da assinatura ser calculada (tentativa de reaproveitar a assinatura para outro pagamento)', () => {
    const v1 = assinar({ dataId, requestId, ts, secret });

    const valido = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId: 'outro-id-999',
      secret,
    });

    expect(valido).toBe(false);
  });

  test('rejeita quando faltam partes do cabeçalho x-signature (ts ou v1 ausentes)', () => {
    expect(paymentGatewayRepository.validarAssinaturaWebhook({ xSignature: 'ts=123', xRequestId: requestId, dataId, secret })).toBe(false);
    expect(paymentGatewayRepository.validarAssinaturaWebhook({ xSignature: '', xRequestId: requestId, dataId, secret })).toBe(false);
  });

  test('rejeita uma assinatura genuína velha demais (proteção contra replay de uma notificação capturada antes)', () => {
    const tsAntigo = String(Math.floor(Date.now() / 1000) - 10 * 60); // 10 minutos atrás — além da tolerância de 5 minutos
    const v1 = assinar({ dataId, requestId, ts: tsAntigo, secret });

    const valido = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature: `ts=${tsAntigo},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret,
    });

    expect(valido).toBe(false);
  });

  test('rejeita quando falta o segredo (webhook ainda não configurado no .env)', () => {
    const v1 = assinar({ dataId, requestId, ts, secret });
    const valido = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
      secret: undefined,
    });
    expect(valido).toBe(false);
  });
});
