'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { Produto, Usuario } = require('../src/models');
const bcrypt = require('bcrypt');

// Só os testes de delivery (abaixo) usam isso — os demais pedidos deste arquivo
// são todos "retirada" e nunca chamam shippingService/cepService/geocodingService/routingService.
jest.mock('../src/services/cepService');
jest.mock('../src/services/geocodingService');
jest.mock('../src/services/routingService');
const cepService = require('../src/services/cepService');
const geocodingService = require('../src/services/geocodingService');
const routingService = require('../src/services/routingService');

// Coordenada de exemplo — quem decide a distância nos testes abaixo é o mock de
// routingService.calcularDistanciaRota, não este valor geográfico em si.
const UM_PONTO_QUALQUER = { lat: -23.5, lon: -46.6 };

async function criarClienteEToken() {
  const resposta = await request(app).post('/api/auth/registrar').send({
    nome: 'Cliente Teste',
    email: 'cliente@teste.com',
    senha: '123456',
  });
  return { token: resposta.body.token, usuarioId: resposta.body.usuario.id };
}

async function criarAdminEToken() {
  const senhaHash = await bcrypt.hash('dono123', 10);
  await Usuario.create({ nome: 'Admin Teste', email: 'admin-teste@donabronni.com', senhaHash, role: 'admin' });
  const resposta = await request(app).post('/api/auth/login').send({ email: 'admin-teste@donabronni.com', senha: 'dono123' });
  return resposta.body.token;
}

describe('Pedidos', () => {
  test('cliente não autenticado não consegue criar pedido', async () => {
    const resposta = await request(app).post('/api/pedidos').send({});
    expect(resposta.status).toBe(401);
  });

  test('cria um pedido recalculando o preço no servidor (não confia no preço do cliente)', async () => {
    const produto = await Produto.create({
      nome: 'Pizza Teste', precoBase: 37.99, categoria: 'pizza_salgada',
      permiteBordaRecheada: true,
    });
    const { token } = await criarClienteEToken();

    const resposta = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        itens: [{ produtoId: produto._id, tipo: 'unica', borda: 'catupiry', quantidade: 2 }],
        entrega: { tipo: 'retirada' },
        pagamento: { forma: 'dinheiro' },
      });

    expect(resposta.status).toBe(201);
    // (37.99 + 10 de borda) * 2 = 95.98 — mesmo que o front-end tentasse mandar um
    // valor diferente, o backend ignora e recalcula a partir do catálogo.
    expect(resposta.body.subtotal).toBeCloseTo(95.98, 2);
    expect(resposta.body.total).toBeCloseTo(95.98, 2);
    expect(resposta.body.itens[0].borda).toBe('catupiry');
  });

  test('pedido criado pelo cliente aparece na listagem do admin (fonte única de dados)', async () => {
    const produto = await Produto.create({ nome: 'Pizza Unificação', precoBase: 30, categoria: 'pizza_salgada' });
    const { token } = await criarClienteEToken();
    const tokenAdmin = await criarAdminEToken();

    await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });

    const respostaAdmin = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(respostaAdmin.status).toBe(200);
    expect(respostaAdmin.body.length).toBe(1);
    expect(respostaAdmin.body[0].clienteNome).toBe('Cliente Teste');
  });

  test('admin atualiza o status e o cliente vê a mudança no histórico', async () => {
    const produto = await Produto.create({ nome: 'Pizza Status', precoBase: 25, categoria: 'pizza_salgada' });
    const { token } = await criarClienteEToken();
    const tokenAdmin = await criarAdminEToken();

    const criado = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });
    const numeroNota = criado.body.numeroNota;

    await request(app)
      .patch(`/api/pedidos/${numeroNota}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'preparando' });

    const meusPedidos = await request(app).get('/api/pedidos/meus').set('Authorization', `Bearer ${token}`);
    expect(meusPedidos.body[0].status).toBe('preparando');
  });

  test('cliente não-admin não consegue listar todos os pedidos', async () => {
    const { token } = await criarClienteEToken();
    const resposta = await request(app).get('/api/pedidos').set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(403);
  });

  test('meia a meia recusa segundo sabor que não aceita dois sabores (ex.: uma bebida)', async () => {
    const pizza = await Produto.create({
      nome: 'Pizza Meia A', precoBase: 30, categoria: 'pizza_salgada', permiteDoisSabores: true,
    });
    const bebida = await Produto.create({ nome: 'Refrigerante', precoBase: 10, categoria: 'bebida' });
    const { token } = await criarClienteEToken();

    const resposta = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: pizza._id, produtoSabor2Id: bebida._id, tipo: 'meia_meia', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });

    expect(resposta.status).toBe(422);
  });

  test('meia a meia recusa os dois sabores sendo o mesmo produto', async () => {
    const pizza = await Produto.create({
      nome: 'Pizza Meia B', precoBase: 30, categoria: 'pizza_salgada', permiteDoisSabores: true,
    });
    const { token } = await criarClienteEToken();

    const resposta = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: pizza._id, produtoSabor2Id: pizza._id, tipo: 'meia_meia', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });

    expect(resposta.status).toBe(422);
  });

  test('pedido de delivery: frete é recalculado no servidor a partir da distância de rota (não confia no valor do cliente)', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Perto', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 1.0 });
    const produto = await Produto.create({ nome: 'Pizza Delivery', precoBase: 40, categoria: 'pizza_salgada' });
    const { token } = await criarClienteEToken();

    const resposta = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: {
        tipo: 'delivery',
        endereco: { rua: 'Rua Perto', numero: '100', bairro: 'Jaraguá', cep: '05000-000' },
        // taxaEntrega mandada pelo cliente é ignorada de propósito — só serve pra
        // provar que o backend não confia nela e recalcula por conta própria.
        taxaEntrega: 999,
      },
      pagamento: { forma: 'dinheiro' },
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.entrega.taxaEntrega).toBe(5); // ~1km -> faixa até 2.9km = R$5
    expect(resposta.body.entrega.distanciaKm).toBeCloseTo(1.0, 1);
    expect(resposta.body.total).toBeCloseTo(45, 2); // 40 (produto) + 5 (frete real, não os 999 enviados)
  });

  test('pedido de delivery recusado quando o endereço fica fora do raio de entrega (por rota, não linha reta)', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Longe', bairro: 'Santana', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 16.6 }); // rota real bem mais longa que a linha reta
    const produto = await Produto.create({ nome: 'Pizza Fora Do Raio', precoBase: 40, categoria: 'pizza_salgada' });
    const { token } = await criarClienteEToken();

    const resposta = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'delivery', endereco: { rua: 'Rua X', numero: '1', bairro: 'Santana', cep: '02403-010' } },
      pagamento: { forma: 'dinheiro' },
    });

    expect(resposta.status).toBe(422);
    expect(resposta.body.erro).toMatch(/fora do nosso raio/i);
  });
});

describe('PATCH /api/pedidos/:numeroNota/cancelar', () => {
  async function criarPedidoRecebido(token) {
    const produto = await Produto.create({ nome: `Pizza Cancelar ${Date.now()}`, precoBase: 20, categoria: 'pizza_salgada' });
    const criado = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${token}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });
    return criado.body.numeroNota;
  }

  test('sem token não consegue cancelar', async () => {
    const resposta = await request(app).patch('/api/pedidos/DA-inexistente/cancelar').send();
    expect(resposta.status).toBe(401);
  });

  test('dono cancela o próprio pedido enquanto ainda está "recebido"', async () => {
    const { token } = await criarClienteEToken();
    const numeroNota = await criarPedidoRecebido(token);

    const resposta = await request(app)
      .patch(`/api/pedidos/${numeroNota}/cancelar`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(resposta.status).toBe(200);
    expect(resposta.body.status).toBe('cancelado');
  });

  test('não consegue cancelar pedido de outro cliente, e a resposta não revela se o pedido existe (anti-enumeração)', async () => {
    const dono = await criarClienteEToken();
    const numeroNota = await criarPedidoRecebido(dono.token);

    const outroCliente = await request(app).post('/api/auth/registrar').send({
      nome: 'Outro Cliente', email: 'outro@teste.com', senha: '123456',
    });

    const respostaPedidoAlheio = await request(app)
      .patch(`/api/pedidos/${numeroNota}/cancelar`)
      .set('Authorization', `Bearer ${outroCliente.body.token}`)
      .send();
    const respostaInexistente = await request(app)
      .patch('/api/pedidos/DA-20260101-9999/cancelar')
      .set('Authorization', `Bearer ${outroCliente.body.token}`)
      .send();

    // Mesmo status E mesma mensagem nos dois casos — não dá pra um cliente
    // descobrir, pela resposta, se um numeroNota existe (é de outra pessoa) ou não
    // existe de verdade.
    expect(respostaPedidoAlheio.status).toBe(404);
    expect(respostaInexistente.status).toBe(404);
    expect(respostaPedidoAlheio.body.erro).toBe(respostaInexistente.body.erro);
  });

  test('não consegue cancelar um pedido que já saiu de "recebido" (já entrou em preparo)', async () => {
    const { token } = await criarClienteEToken();
    const tokenAdmin = await criarAdminEToken();
    const numeroNota = await criarPedidoRecebido(token);

    await request(app)
      .patch(`/api/pedidos/${numeroNota}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'preparando' });

    const resposta = await request(app)
      .patch(`/api/pedidos/${numeroNota}/cancelar`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(resposta.status).toBe(422);

    // e o status no banco continua "preparando", não virou "cancelado"
    const meusPedidos = await request(app).get('/api/pedidos/meus').set('Authorization', `Bearer ${token}`);
    expect(meusPedidos.body[0].status).toBe('preparando');
  });
});
