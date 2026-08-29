'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { Produto, Usuario } = require('../src/models');
const bcrypt = require('bcrypt');

async function criarClienteEToken(sufixo = '') {
  const resposta = await request(app).post('/api/auth/registrar').send({
    nome: `Cliente Avaliação${sufixo}`, email: `cliente-avaliacao${sufixo}@teste.com`, senha: '123456',
  });
  return resposta.body.token;
}

async function criarAdminEToken() {
  const senhaHash = await bcrypt.hash('dono123', 10);
  await Usuario.create({ nome: 'Admin Teste', email: 'admin-avaliacao@donabronni.com', senhaHash, role: 'admin' });
  const resposta = await request(app).post('/api/auth/login').send({ email: 'admin-avaliacao@donabronni.com', senha: 'dono123' });
  return resposta.body.token;
}

// Cria um pedido do cliente e já marca como "entregue" (via admin) — estado
// necessário pra poder avaliar.
async function criarPedidoEntregue(tokenCliente, tokenAdmin) {
  const produto = await Produto.create({ nome: `Pizza Avaliação ${Date.now()}`, precoBase: 25, categoria: 'pizza_salgada' });
  const criado = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${tokenCliente}`).send({
    itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
    entrega: { tipo: 'retirada' },
    pagamento: { forma: 'dinheiro' },
  });
  const numeroNota = criado.body.numeroNota;
  await request(app)
    .patch(`/api/pedidos/${numeroNota}/status`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ status: 'entregue' });
  return numeroNota;
}

describe('Avaliações', () => {
  test('sem token não consegue avaliar', async () => {
    const resposta = await request(app).post('/api/avaliacoes').send({ numeroNota: 'DA-x', nota: 5 });
    expect(resposta.status).toBe(401);
  });

  test('cliente avalia o próprio pedido entregue com sucesso', async () => {
    const tokenCliente = await criarClienteEToken('1');
    const tokenAdmin = await criarAdminEToken();
    const numeroNota = await criarPedidoEntregue(tokenCliente, tokenAdmin);

    const resposta = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ numeroNota, nota: 5, comentario: 'Pizza excelente, chegou quentinha!' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.nota).toBe(5);
  });

  test('não consegue avaliar pedido que ainda não foi entregue', async () => {
    const tokenCliente = await criarClienteEToken('2');
    const produto = await Produto.create({ nome: 'Pizza Pendente', precoBase: 25, categoria: 'pizza_salgada' });
    const criado = await request(app).post('/api/pedidos').set('Authorization', `Bearer ${tokenCliente}`).send({
      itens: [{ produtoId: produto._id, tipo: 'unica', quantidade: 1 }],
      entrega: { tipo: 'retirada' },
      pagamento: { forma: 'dinheiro' },
    });

    const resposta = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({ numeroNota: criado.body.numeroNota, nota: 5 });

    expect(resposta.status).toBe(422);
  });

  test('não consegue avaliar pedido de outro cliente (resposta idêntica à de pedido inexistente)', async () => {
    const dono = await criarClienteEToken('3');
    const tokenAdmin = await criarAdminEToken();
    const numeroNota = await criarPedidoEntregue(dono, tokenAdmin);
    const outroToken = await criarClienteEToken('4');

    const respostaAlheio = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${outroToken}`)
      .send({ numeroNota, nota: 3 });
    const respostaInexistente = await request(app)
      .post('/api/avaliacoes')
      .set('Authorization', `Bearer ${outroToken}`)
      .send({ numeroNota: 'DA-20260101-9999', nota: 3 });

    expect(respostaAlheio.status).toBe(404);
    expect(respostaInexistente.status).toBe(404);
    expect(respostaAlheio.body.erro).toBe(respostaInexistente.body.erro);
  });

  test('não consegue avaliar o mesmo pedido duas vezes', async () => {
    const tokenCliente = await criarClienteEToken('5');
    const tokenAdmin = await criarAdminEToken();
    const numeroNota = await criarPedidoEntregue(tokenCliente, tokenAdmin);

    await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${tokenCliente}`).send({ numeroNota, nota: 4 });
    const segunda = await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${tokenCliente}`).send({ numeroNota, nota: 2 });

    expect(segunda.status).toBe(409);
  });

  test('GET /api/avaliacoes/minhas só devolve avaliações do próprio cliente', async () => {
    const tokenCliente = await criarClienteEToken('6');
    const tokenAdmin = await criarAdminEToken();
    const numeroNota = await criarPedidoEntregue(tokenCliente, tokenAdmin);
    await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${tokenCliente}`).send({ numeroNota, nota: 5 });

    const outroToken = await criarClienteEToken('7');

    const minhas = await request(app).get('/api/avaliacoes/minhas').set('Authorization', `Bearer ${tokenCliente}`);
    const minhasDoOutro = await request(app).get('/api/avaliacoes/minhas').set('Authorization', `Bearer ${outroToken}`);

    expect(minhas.body.length).toBe(1);
    expect(minhasDoOutro.body.length).toBe(0);
  });

  test('GET /api/avaliacoes/publicas não exige login, mostra só primeiro nome e ignora avaliações sem comentário', async () => {
    const tokenCliente = await criarClienteEToken('8');
    const tokenAdmin = await criarAdminEToken();

    const numeroNota1 = await criarPedidoEntregue(tokenCliente, tokenAdmin);
    await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${tokenCliente}`).send({
      numeroNota: numeroNota1, nota: 5, comentario: 'Recomendo muito!',
    });

    const outroToken = await criarClienteEToken('9');
    const numeroNota2 = await criarPedidoEntregue(outroToken, tokenAdmin);
    await request(app).post('/api/avaliacoes').set('Authorization', `Bearer ${outroToken}`).send({
      numeroNota: numeroNota2, nota: 4, // sem comentário — não deve aparecer nas públicas
    });

    const publicas = await request(app).get('/api/avaliacoes/publicas');
    expect(publicas.status).toBe(200);
    expect(publicas.body.length).toBe(1);
    expect(publicas.body[0].nome).toBe('Cliente'); // "Cliente Avaliação8" -> primeiro nome
    expect(publicas.body[0].comentario).toBe('Recomendo muito!');
    expect(publicas.body[0].id).toBeDefined();
  });
});
