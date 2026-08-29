'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { Usuario } = require('../src/models');

// Automock: `emailService.enviarEmailRecuperacaoSenha` vira uma função-espiã que
// não manda e-mail de verdade nenhum — sem isso, rodar a suíte de testes dependeria
// de credenciais reais do Gmail e mandaria e-mails de teste de verdade a cada
// execução. Isso também é o que permite "capturar" o token: ele só existe em texto
// puro dentro do link passado pra essa função (o banco só guarda o hash).
jest.mock('../src/services/emailService');
const emailService = require('../src/services/emailService');

function extrairTokenDoLink(link) {
  return new URL(link).searchParams.get('token');
}

async function registrarUsuario(sufixo) {
  return request(app).post('/api/auth/registrar').send({
    nome: `Recuperação ${sufixo}`,
    email: `recuperacao${sufixo}@teste.com`,
    senha: '123456',
  });
}

async function solicitarESolicitarToken(email) {
  await request(app).post('/api/auth/esqueci-senha').send({ email });
  const ultimaChamada = emailService.enviarEmailRecuperacaoSenha.mock.calls.at(-1);
  return extrairTokenDoLink(ultimaChamada[2]);
}

describe('Recuperação de senha — POST /api/auth/esqueci-senha', () => {
  beforeEach(() => jest.clearAllMocks());

  test('e-mail existente: envia o e-mail e devolve a mensagem genérica', async () => {
    await registrarUsuario('1');
    const resposta = await request(app).post('/api/auth/esqueci-senha').send({ email: 'recuperacao1@teste.com' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ok).toBe(true);
    expect(emailService.enviarEmailRecuperacaoSenha).toHaveBeenCalledTimes(1);

    const [destinatario, , link] = emailService.enviarEmailRecuperacaoSenha.mock.calls[0];
    expect(destinatario).toBe('recuperacao1@teste.com');
    expect(link).toContain('/redefinir-senha?token=');
  });

  // 🔒 O teste de segurança mais importante desta rota: a resposta para um e-mail
  // que NÃO existe precisa ser byte a byte igual à de um e-mail que existe — é o
  // que impede alguém de descobrir, tentando e-mail por e-mail, quais têm conta.
  test('e-mail inexistente: devolve a MESMA resposta genérica, sem enviar nenhum e-mail', async () => {
    const resposta = await request(app).post('/api/auth/esqueci-senha').send({ email: 'naoexiste@teste.com' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.ok).toBe(true);
    expect(resposta.body.mensagem).toMatch(/se esse e-mail estiver cadastrado/i);
    expect(emailService.enviarEmailRecuperacaoSenha).not.toHaveBeenCalled();
  });

  test('recusa e-mail em formato inválido com 422', async () => {
    const resposta = await request(app).post('/api/auth/esqueci-senha').send({ email: 'isso-nao-e-um-email' });
    expect(resposta.status).toBe(422);
  });

  test('o banco nunca guarda o token em texto puro, só o hash dele', async () => {
    await registrarUsuario('2');
    const token = await solicitarESolicitarToken('recuperacao2@teste.com');

    const usuario = await Usuario.findOne({ email: 'recuperacao2@teste.com' }).select('+resetSenhaTokenHash');
    expect(usuario.resetSenhaTokenHash).toBeDefined();
    expect(usuario.resetSenhaTokenHash).not.toBe(token);
  });

  test('uma segunda solicitação invalida o token da primeira (só o link mais recente funciona)', async () => {
    await registrarUsuario('8');
    const tokenAntigo = await solicitarESolicitarToken('recuperacao8@teste.com');
    await solicitarESolicitarToken('recuperacao8@teste.com'); // segunda solicitação

    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ token: tokenAntigo, novaSenha: 'senhaNova123' });
    expect(resposta.status).toBe(400);
  });

  test('mesmo se o envio do e-mail falhar, a resposta ao cliente continua a genérica de sucesso', async () => {
    await registrarUsuario('7');
    emailService.enviarEmailRecuperacaoSenha.mockRejectedValueOnce(new Error('SMTP indisponível'));

    const resposta = await request(app).post('/api/auth/esqueci-senha').send({ email: 'recuperacao7@teste.com' });
    expect(resposta.status).toBe(200);
    expect(resposta.body.ok).toBe(true);
  });
});

describe('Redefinição de senha — POST /api/auth/redefinir-senha', () => {
  beforeEach(() => jest.clearAllMocks());

  test('token válido: redefine a senha e permite logar só com a nova', async () => {
    await registrarUsuario('3');
    const token = await solicitarESolicitarToken('recuperacao3@teste.com');

    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: 'senhaNova123' });
    expect(resposta.status).toBe(200);
    expect(resposta.body.ok).toBe(true);

    const loginComSenhaAntiga = await request(app).post('/api/auth/login').send({ email: 'recuperacao3@teste.com', senha: '123456' });
    const loginComSenhaNova = await request(app).post('/api/auth/login').send({ email: 'recuperacao3@teste.com', senha: 'senhaNova123' });
    expect(loginComSenhaAntiga.status).toBe(401);
    expect(loginComSenhaNova.status).toBe(200);
  });

  test('o mesmo token não pode ser usado uma segunda vez', async () => {
    await registrarUsuario('4');
    const token = await solicitarESolicitarToken('recuperacao4@teste.com');

    const primeiraTentativa = await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: 'primeiraSenha1' });
    expect(primeiraTentativa.status).toBe(200);

    const segundaTentativa = await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: 'segundaSenha2' });
    expect(segundaTentativa.status).toBe(400);
  });

  test('recusa um token que nunca existiu', async () => {
    const resposta = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ token: 'token-inventado-que-nao-existe-no-banco', novaSenha: 'senhaNova123' });
    expect(resposta.status).toBe(400);
  });

  test('recusa um token expirado', async () => {
    await registrarUsuario('5');
    const token = await solicitarESolicitarToken('recuperacao5@teste.com');

    // Simula a passagem do tempo forçando a expiração direto no banco — sem isso, o
    // teste precisaria esperar 1 hora de verdade para validar este cenário.
    await Usuario.updateOne({ email: 'recuperacao5@teste.com' }, { resetSenhaExpira: new Date(Date.now() - 1000) });

    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: 'senhaNova123' });
    expect(resposta.status).toBe(400);
  });

  test('recusa nova senha menor que 6 caracteres', async () => {
    await registrarUsuario('6');
    const token = await solicitarESolicitarToken('recuperacao6@teste.com');

    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ token, novaSenha: '123' });
    expect(resposta.status).toBe(422);
  });

  test('recusa requisição sem token', async () => {
    const resposta = await request(app).post('/api/auth/redefinir-senha').send({ novaSenha: 'senhaNova123' });
    expect(resposta.status).toBe(422);
  });
});
