'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { Produto } = require('../src/models');

// Mocka a única "borda de rede" desta feature — o resto (paymentService,
// pedidoService, rotas) roda de verdade, mesmo padrão já usado para
// cepService/geocodingService/routingService em pedidos.test.js e frete.test.js.
jest.mock('../src/repositories/paymentGatewayRepository');
const paymentGatewayRepository = require('../src/repositories/paymentGatewayRepository');

async function criarClienteEToken(email = 'cliente@teste.com') {
  const resposta = await request(app).post('/api/auth/registrar').send({
    nome: 'Cliente Teste',
    email,
    senha: '123456',
  });
  return { token: resposta.body.token, usuarioId: resposta.body.usuario.id };
}

async function criarPedido(token, forma) {
  const produto = await Produto.create({ nome: `Pizza ${forma} ${Date.now()}`, precoBase: 50, categoria: 'pizza_salgada' });
  const resposta = await request(app)
    .post('/api/pedidos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma },
    });
  return resposta.body.numeroNota;
}

describe('POST /api/pagamentos', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cliente não autenticado não consegue criar pagamento', async () => {
    const resposta = await request(app).post('/api/pagamentos').send({ numeroNota: 'DA-inexistente' });
    expect(resposta.status).toBe(401);
  });

  test('pix: cria o pagamento no gateway e devolve qrCode/qrCodeBase64 (nunca o valor, que vem só do pedido salvo)', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedido(token, 'pix');
    paymentGatewayRepository.criarPagamentoPix.mockResolvedValue({
      pagamentoId: 'mp-123',
      status: 'pending',
      qrCode: '00020126PIX-REAL',
      qrCodeBase64: 'base64fake==',
      expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    });

    const resposta = await request(app)
      .post('/api/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ numeroNota });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ qrCode: '00020126PIX-REAL', qrCodeBase64: 'base64fake==', linkPagamento: null, status: 'pendente' });
    expect(paymentGatewayRepository.criarPagamentoPix).toHaveBeenCalledWith(
      expect.objectContaining({ valor: 50, numeroNota })
    );
  });

  test('cartão: cria a preferência no gateway e devolve linkPagamento', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedido(token, 'cartao');
    paymentGatewayRepository.criarPreferenciaCartao.mockResolvedValue({
      pagamentoId: 'pref-456',
      linkPagamento: 'https://sandbox.mercadopago.com/checkout/pref-456',
    });

    const resposta = await request(app)
      .post('/api/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ numeroNota });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      qrCode: null,
      qrCodeBase64: null,
      linkPagamento: 'https://sandbox.mercadopago.com/checkout/pref-456',
      status: 'pendente',
    });
  });

  test('pagamento em dinheiro não usa gateway: 422, nunca chama o Mercado Pago', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedido(token, 'dinheiro');

    const resposta = await request(app)
      .post('/api/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ numeroNota });

    expect(resposta.status).toBe(422);
    expect(paymentGatewayRepository.criarPagamentoPix).not.toHaveBeenCalled();
    expect(paymentGatewayRepository.criarPreferenciaCartao).not.toHaveBeenCalled();
  });

  test('pedido de outro cliente (ou inexistente): 404, sem revelar qual dos dois motivos foi', async () => {
    const dono = await criarClienteEToken('dono@teste.com');
    const numeroNota = await criarPedido(dono.token, 'pix');
    const outro = await criarClienteEToken('outro@teste.com');

    const respostaAlheio = await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${outro.token}`).send({ numeroNota });
    const respostaInexistente = await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${outro.token}`).send({ numeroNota: 'DA-20260101-9999' });

    expect(respostaAlheio.status).toBe(404);
    expect(respostaInexistente.status).toBe(404);
    expect(respostaAlheio.body.erro).toBe(respostaInexistente.body.erro);
  });

  test('reaproveita uma transação Pix pendente já existente em vez de gerar uma nova a cada chamada', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedido(token, 'pix');
    paymentGatewayRepository.criarPagamentoPix.mockResolvedValue({
      pagamentoId: 'mp-123',
      status: 'pending',
      qrCode: '00020126PIX-REAL',
      qrCodeBase64: 'base64fake==',
      expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    });

    await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${token}`).send({ numeroNota });
    const segunda = await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${token}`).send({ numeroNota });

    expect(segunda.status).toBe(201);
    expect(segunda.body.qrCode).toBe('00020126PIX-REAL');
    expect(paymentGatewayRepository.criarPagamentoPix).toHaveBeenCalledTimes(1);
  });

  test('não é possível cobrar de novo um pedido já pago', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedido(token, 'pix');
    paymentGatewayRepository.criarPagamentoPix.mockResolvedValue({
      pagamentoId: 'mp-123', status: 'approved', qrCode: 'x', qrCodeBase64: 'y', expiraEm: new Date(),
    });
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
    paymentGatewayRepository.buscarPagamento.mockResolvedValue({ id: 'mp-123', status: 'approved', external_reference: numeroNota });

    await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${token}`).send({ numeroNota });
    await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-123', type: 'payment' }).send({});

    const resposta = await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${token}`).send({ numeroNota });
    expect(resposta.status).toBe(422);
  });
});

describe('POST /api/webhooks/pagamento', () => {
  beforeEach(() => jest.clearAllMocks());

  async function criarPedidoComPixPendente(token) {
    const numeroNota = await criarPedido(token, 'pix');
    paymentGatewayRepository.criarPagamentoPix.mockResolvedValue({
      pagamentoId: 'mp-789', status: 'pending', qrCode: 'x', qrCodeBase64: 'y', expiraEm: new Date(Date.now() + 30 * 60 * 1000),
    });
    await request(app).post('/api/pagamentos').set('Authorization', `Bearer ${token}`).send({ numeroNota });
    return numeroNota;
  }

  test('assinatura inválida: 401, não consulta nem atualiza nada', async () => {
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(false);

    const resposta = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-789', type: 'payment' }).send({});

    expect(resposta.status).toBe(401);
    expect(paymentGatewayRepository.buscarPagamento).not.toHaveBeenCalled();
  });

  test('pagamento aprovado: confirma o pedido (statusPagamento vira "pago")', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedidoComPixPendente(token);
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
    paymentGatewayRepository.buscarPagamento.mockResolvedValue({ id: 'mp-789', status: 'approved', external_reference: numeroNota });

    const resposta = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-789', type: 'payment' }).send({});

    expect(resposta.status).toBe(200);
    const statusPedido = await request(app).get(`/api/pedidos/${numeroNota}/status`).set('Authorization', `Bearer ${token}`);
    expect(statusPedido.body.statusPagamento).toBe('pago');
    expect(statusPedido.body.transacaoStatus).toBe('aprovado');
  });

  test('notificação duplicada (o gateway reenvia o mesmo evento) não gera erro nem regride o status', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedidoComPixPendente(token);
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
    paymentGatewayRepository.buscarPagamento.mockResolvedValue({ id: 'mp-789', status: 'approved', external_reference: numeroNota });

    const primeira = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-789', type: 'payment' }).send({});
    const segunda = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-789', type: 'payment' }).send({});

    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    const statusPedido = await request(app).get(`/api/pedidos/${numeroNota}/status`).set('Authorization', `Bearer ${token}`);
    expect(statusPedido.body.statusPagamento).toBe('pago');
  });

  test('pagamento recusado: transação fica "recusado", pedido continua com pagamento pendente', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedidoComPixPendente(token);
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
    paymentGatewayRepository.buscarPagamento.mockResolvedValue({ id: 'mp-789', status: 'rejected', external_reference: numeroNota });

    await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'mp-789', type: 'payment' }).send({});

    const statusPedido = await request(app).get(`/api/pedidos/${numeroNota}/status`).set('Authorization', `Bearer ${token}`);
    expect(statusPedido.body.statusPagamento).toBe('pendente');
    expect(statusPedido.body.transacaoStatus).toBe('recusado');
  });

  test('tipo de evento diferente de "payment"/"order" (ex.: merchant_order): 200, ignora sem consultar o gateway', async () => {
    paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);

    const resposta = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': '999', type: 'merchant_order' }).send({});

    expect(resposta.status).toBe(200);
    expect(paymentGatewayRepository.buscarPagamento).not.toHaveBeenCalled();
    expect(paymentGatewayRepository.buscarOrder).not.toHaveBeenCalled();
  });

  // 🔒 Pix passa pela API de Orders — o Mercado Pago notifica esses pagamentos no
  // tópico "order" (id da ordem), não "payment" (id do pagamento clássico usado
  // pelo cartão/Checkout Pro). São dois recursos diferentes, buscados de formas
  // diferentes — sem esse branch, uma notificação de Pix real era simplesmente
  // ignorada (confirmado testando manualmente contra a API real do Mercado Pago).
  describe('tópico "order" (Pix via API de Orders)', () => {
    test('order processada (aprovada): confirma o pedido (statusPagamento vira "pago")', async () => {
      const { token } = await criarClienteEToken();
      const numeroNota = await criarPedidoComPixPendente(token);
      paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
      paymentGatewayRepository.buscarOrder.mockResolvedValue({
        id: 'ORD-1',
        status: 'processed',
        external_reference: numeroNota,
        transactions: { payments: [{ id: 'PAY-1', status: 'processed' }] },
      });

      const resposta = await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'ORD-1', type: 'order' }).send({});

      expect(resposta.status).toBe(200);
      const statusPedido = await request(app).get(`/api/pedidos/${numeroNota}/status`).set('Authorization', `Bearer ${token}`);
      expect(statusPedido.body.statusPagamento).toBe('pago');
      expect(statusPedido.body.transacaoStatus).toBe('aprovado');
    });

    test('order cancelada: transação fica "cancelado", pedido continua com pagamento pendente', async () => {
      const { token } = await criarClienteEToken();
      const numeroNota = await criarPedidoComPixPendente(token);
      paymentGatewayRepository.validarAssinaturaWebhook.mockReturnValue(true);
      paymentGatewayRepository.buscarOrder.mockResolvedValue({
        id: 'ORD-2',
        status: 'cancelled',
        external_reference: numeroNota,
        transactions: { payments: [{ id: 'PAY-2', status: 'cancelled' }] },
      });

      await request(app).post('/api/webhooks/pagamento').query({ 'data.id': 'ORD-2', type: 'order' }).send({});

      const statusPedido = await request(app).get(`/api/pedidos/${numeroNota}/status`).set('Authorization', `Bearer ${token}`);
      expect(statusPedido.body.statusPagamento).toBe('pendente');
      expect(statusPedido.body.transacaoStatus).toBe('cancelado');
    });
  });
});
