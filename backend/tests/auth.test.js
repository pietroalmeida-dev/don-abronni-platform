'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');

describe('Autenticação', () => {
  test('registra um novo cliente com sucesso', async () => {
    const resposta = await request(app).post('/api/auth/registrar').send({
      nome: 'Maria Teste',
      email: 'maria@teste.com',
      senha: '123456',
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.usuario.email).toBe('maria@teste.com');
    expect(resposta.body.usuario.role).toBe('cliente');
    expect(resposta.body.token).toBeDefined();
    // A senha (nem o hash) nunca deve vir na resposta.
    expect(resposta.body.usuario.senhaHash).toBeUndefined();
  });

  test('rejeita cadastro com e-mail já usado', async () => {
    await request(app).post('/api/auth/registrar').send({ nome: 'A', email: 'dup@teste.com', senha: '123456' });
    const resposta = await request(app).post('/api/auth/registrar').send({ nome: 'B', email: 'dup@teste.com', senha: '123456' });

    expect(resposta.status).toBe(409);
  });

  test('rejeita senha menor que 6 caracteres', async () => {
    const resposta = await request(app).post('/api/auth/registrar').send({ nome: 'A', email: 'a@teste.com', senha: '123' });
    expect(resposta.status).toBe(422);
  });

  test('faz login com credenciais corretas', async () => {
    await request(app).post('/api/auth/registrar').send({ nome: 'Login Teste', email: 'login@teste.com', senha: '123456' });
    const resposta = await request(app).post('/api/auth/login').send({ email: 'login@teste.com', senha: '123456' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toBeDefined();
  });

  test('rejeita login com senha errada', async () => {
    await request(app).post('/api/auth/registrar').send({ nome: 'X', email: 'x@teste.com', senha: '123456' });
    const resposta = await request(app).post('/api/auth/login').send({ email: 'x@teste.com', senha: 'errada123' });

    expect(resposta.status).toBe(401);
  });

  test('GET /api/auth/me exige autenticação', async () => {
    const resposta = await request(app).get('/api/auth/me');
    expect(resposta.status).toBe(401);
  });
});

describe('Meu Perfil (editar dados e trocar senha)', () => {
  async function registrarEToken(sufixo) {
    const resposta = await request(app).post('/api/auth/registrar').send({
      nome: `Perfil ${sufixo}`, email: `perfil${sufixo}@teste.com`, senha: '123456',
    });
    return resposta.body.token;
  }

  test('sem token não consegue editar perfil nem trocar senha', async () => {
    const perfil = await request(app).patch('/api/auth/me').send({ nome: 'X' });
    const senha = await request(app).patch('/api/auth/me/senha').send({ senhaAtual: 'a', novaSenha: '123456' });
    expect(perfil.status).toBe(401);
    expect(senha.status).toBe(401);
  });

  test('edita nome e telefone com sucesso', async () => {
    const token = await registrarEToken('1');
    const resposta = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Nome Editado', telefone: '11999998888' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Nome Editado');
    expect(resposta.body.telefone).toBe('11999998888');

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.nome).toBe('Nome Editado');
  });

  test('recusa editar perfil sem nome', async () => {
    const token = await registrarEToken('2');
    const resposta = await request(app).patch('/api/auth/me').set('Authorization', `Bearer ${token}`).send({ nome: '' });
    expect(resposta.status).toBe(422);
  });

  test('troca a senha com sucesso e consegue logar com a nova', async () => {
    const token = await registrarEToken('3');
    const resposta = await request(app)
      .patch('/api/auth/me/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: '123456', novaSenha: 'novaSenha123' });
    expect(resposta.status).toBe(200);

    const loginAntiga = await request(app).post('/api/auth/login').send({ email: 'perfil3@teste.com', senha: '123456' });
    const loginNova = await request(app).post('/api/auth/login').send({ email: 'perfil3@teste.com', senha: 'novaSenha123' });
    expect(loginAntiga.status).toBe(401);
    expect(loginNova.status).toBe(200);
  });

  test('recusa trocar senha se a senha atual estiver errada', async () => {
    const token = await registrarEToken('4');
    const resposta = await request(app)
      .patch('/api/auth/me/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: 'senhaErrada', novaSenha: 'novaSenha123' });
    expect(resposta.status).toBe(401);

    // e a senha original continua funcionando
    const login = await request(app).post('/api/auth/login').send({ email: 'perfil4@teste.com', senha: '123456' });
    expect(login.status).toBe(200);
  });

  test('recusa nova senha menor que 6 caracteres', async () => {
    const token = await registrarEToken('5');
    const resposta = await request(app)
      .patch('/api/auth/me/senha')
      .set('Authorization', `Bearer ${token}`)
      .send({ senhaAtual: '123456', novaSenha: '123' });
    expect(resposta.status).toBe(422);
  });
});
