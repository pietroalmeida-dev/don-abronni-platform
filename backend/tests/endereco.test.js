'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');

async function criarClienteEToken(sufixo = '') {
  const resposta = await request(app).post('/api/auth/registrar').send({
    nome: `Cliente Endereço${sufixo}`, email: `cliente-endereco${sufixo}@teste.com`, senha: '123456',
  });
  return resposta.body.token;
}

const enderecoValido = { rua: 'Rua Baltazar de Campos', numero: '253', bairro: 'Zona Norte', cep: '01001000' };

describe('Endereços', () => {
  test('sem token não consegue listar nem adicionar', async () => {
    const listar = await request(app).get('/api/enderecos');
    const adicionar = await request(app).post('/api/enderecos').send(enderecoValido);
    expect(listar.status).toBe(401);
    expect(adicionar.status).toBe(401);
  });

  test('adiciona um endereço e ele aparece na listagem', async () => {
    const token = await criarClienteEToken('1');
    const adicionado = await request(app).post('/api/enderecos').set('Authorization', `Bearer ${token}`).send(enderecoValido);
    expect(adicionado.status).toBe(201);
    expect(adicionado.body.length).toBe(1);
    expect(adicionado.body[0].rua).toBe('Rua Baltazar de Campos');

    const listagem = await request(app).get('/api/enderecos').set('Authorization', `Bearer ${token}`);
    expect(listagem.body.length).toBe(1);
  });

  test('recusa CEP inválido', async () => {
    const token = await criarClienteEToken('2');
    const resposta = await request(app)
      .post('/api/enderecos')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...enderecoValido, cep: '123' });
    expect(resposta.status).toBe(422);
  });

  test('edita um endereço existente', async () => {
    const token = await criarClienteEToken('3');
    const adicionado = await request(app).post('/api/enderecos').set('Authorization', `Bearer ${token}`).send(enderecoValido);
    const enderecoId = adicionado.body[0].id;

    const editado = await request(app)
      .put(`/api/enderecos/${enderecoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...enderecoValido, numero: '999', complemento: 'Fundos' });

    expect(editado.status).toBe(200);
    expect(editado.body[0].numero).toBe('999');
    expect(editado.body[0].complemento).toBe('Fundos');
  });

  test('remove um endereço existente', async () => {
    const token = await criarClienteEToken('4');
    const adicionado = await request(app).post('/api/enderecos').set('Authorization', `Bearer ${token}`).send(enderecoValido);
    const enderecoId = adicionado.body[0].id;

    const removido = await request(app).delete(`/api/enderecos/${enderecoId}`).set('Authorization', `Bearer ${token}`);
    expect(removido.status).toBe(200);
    expect(removido.body.length).toBe(0);
  });

  test('não consegue editar nem remover endereço de outro cliente', async () => {
    const dono = await criarClienteEToken('5');
    const adicionado = await request(app).post('/api/enderecos').set('Authorization', `Bearer ${dono}`).send(enderecoValido);
    const enderecoId = adicionado.body[0].id;

    const outroToken = await criarClienteEToken('6');
    const editar = await request(app)
      .put(`/api/enderecos/${enderecoId}`)
      .set('Authorization', `Bearer ${outroToken}`)
      .send({ ...enderecoValido, numero: '1' });
    const remover = await request(app).delete(`/api/enderecos/${enderecoId}`).set('Authorization', `Bearer ${outroToken}`);

    expect(editar.status).toBe(404);
    expect(remover.status).toBe(404);

    // e o endereço original continua intacto
    const listagemDono = await request(app).get('/api/enderecos').set('Authorization', `Bearer ${dono}`);
    expect(listagemDono.body.length).toBe(1);
    expect(listagemDono.body[0].numero).toBe('253');
  });

  test('editar/remover endereço inexistente retorna 404', async () => {
    const token = await criarClienteEToken('7');
    const editar = await request(app)
      .put('/api/enderecos/000000000000000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send(enderecoValido);
    const remover = await request(app).delete('/api/enderecos/000000000000000000000000').set('Authorization', `Bearer ${token}`);
    expect(editar.status).toBe(404);
    expect(remover.status).toBe(404);
  });
});
