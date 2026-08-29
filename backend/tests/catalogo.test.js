'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { Produto, Usuario } = require('../src/models');
const bcrypt = require('bcrypt');

async function criarAdminEToken() {
  const senhaHash = await bcrypt.hash('dono123', 10);
  await Usuario.create({ nome: 'Admin Teste', email: 'admin-catalogo@donabronni.com', senhaHash, role: 'admin' });
  const resposta = await request(app).post('/api/auth/login').send({ email: 'admin-catalogo@donabronni.com', senha: 'dono123' });
  return resposta.body.token;
}

async function criarClienteEToken() {
  const resposta = await request(app).post('/api/auth/registrar').send({
    nome: 'Cliente Catálogo', email: 'cliente-catalogo@teste.com', senha: '123456',
  });
  return resposta.body.token;
}

describe('Catálogo', () => {
  beforeEach(async () => {
    await Produto.create([
      { nome: 'Margherita', precoBase: 37.99, categoria: 'pizza_salgada', destaque: true, permiteDoisSabores: true },
      { nome: 'Brigadeiro', precoBase: 37.99, categoria: 'pizza_doce' },
      { nome: 'Coca-Cola 2L', precoBase: 18, categoria: 'bebida' },
    ]);
  });

  test('lista todos os produtos ativos', async () => {
    const resposta = await request(app).get('/api/produtos');
    expect(resposta.status).toBe(200);
    expect(resposta.body.length).toBe(3);
  });

  test('filtra por categoria', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=bebida');
    expect(resposta.status).toBe(200);
    expect(resposta.body.length).toBe(1);
    expect(resposta.body[0].nome).toBe('Coca-Cola 2L');
  });

  test('lista destaques', async () => {
    const resposta = await request(app).get('/api/produtos/destaques');
    expect(resposta.status).toBe(200);
    expect(resposta.body.length).toBe(1);
  });

  test('sabores para o modal "dois sabores" não incluem bebidas', async () => {
    const resposta = await request(app).get('/api/produtos/sabores');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(['Margherita']);
  });
});

describe('CRUD de produto (painel admin)', () => {
  const produtoValido = {
    nome: 'Pizza Nova', descricao: 'Recém-cadastrada', precoBase: 42.5,
    categoria: 'pizza_salgada', permiteDoisSabores: true, permiteBordaRecheada: true,
  };

  test('sem token não consegue criar produto', async () => {
    const resposta = await request(app).post('/api/produtos').send(produtoValido);
    expect(resposta.status).toBe(401);
  });

  test('cliente comum não consegue criar produto', async () => {
    const token = await criarClienteEToken();
    const resposta = await request(app).post('/api/produtos').set('Authorization', `Bearer ${token}`).send(produtoValido);
    expect(resposta.status).toBe(403);
  });

  test('admin cria um produto e ele aparece no catálogo público', async () => {
    const token = await criarAdminEToken();
    const criado = await request(app).post('/api/produtos').set('Authorization', `Bearer ${token}`).send(produtoValido);
    expect(criado.status).toBe(201);
    expect(criado.body.nome).toBe('Pizza Nova');

    const listagem = await request(app).get('/api/produtos');
    expect(listagem.body.some((p) => p.nome === 'Pizza Nova')).toBe(true);
  });

  test('admin não consegue criar produto sem nome ou com categoria inválida', async () => {
    const token = await criarAdminEToken();
    const resposta = await request(app)
      .post('/api/produtos')
      .set('Authorization', `Bearer ${token}`)
      .send({ precoBase: 10, categoria: 'sobremesa' });
    expect(resposta.status).toBe(422);
  });

  test('admin edita o preço de um produto existente', async () => {
    const token = await criarAdminEToken();
    const produto = await Produto.create({ nome: 'Pizza Editável', precoBase: 30, categoria: 'pizza_salgada' });

    const resposta = await request(app)
      .put(`/api/produtos/${produto._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Pizza Editável', precoBase: 45, categoria: 'pizza_salgada' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.precoBase).toBe(45);
  });

  test('admin desativa um produto (soft delete) e ele some do catálogo público', async () => {
    const token = await criarAdminEToken();
    const produto = await Produto.create({ nome: 'Pizza Descontinuada', precoBase: 30, categoria: 'pizza_salgada' });

    const resposta = await request(app).delete(`/api/produtos/${produto._id}`).set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(200);

    const listagem = await request(app).get('/api/produtos');
    expect(listagem.body.some((p) => p.nome === 'Pizza Descontinuada')).toBe(false);
  });

  test('desativar produto inexistente retorna 404', async () => {
    const token = await criarAdminEToken();
    const resposta = await request(app)
      .delete('/api/produtos/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(404);
  });
});
