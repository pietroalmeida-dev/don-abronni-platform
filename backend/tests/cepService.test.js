'use strict';

// Teste unitário puro — não bate no banco nem sobe o app, só verifica que
// cepService traduz corretamente as respostas (e falhas) do ViaCEP. Por isso não
// usa `require('./setup')` como os testes de rota (não precisa de MongoDB).
const cepService = require('../src/services/cepService');

describe('cepService.consultarCep', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('CEP existente: devolve status "encontrado" com logradouro/bairro/localidade/uf', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Rua Voluntários da Pátria', bairro: 'Santana', localidade: 'São Paulo', uf: 'SP' }),
    });

    const resultado = await cepService.consultarCep('02006000');

    expect(resultado).toEqual({
      status: 'encontrado', logradouro: 'Rua Voluntários da Pátria', bairro: 'Santana', localidade: 'São Paulo', uf: 'SP',
    });
  });

  test('CEP existente mas "geral" (sem logradouro específico): campo vem string vazia, não quebra', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bairro: 'Centro', localidade: 'Alguma Cidade', uf: 'SP' }), // sem "logradouro"
    });

    const resultado = await cepService.consultarCep('01000000');

    expect(resultado).toEqual({ status: 'encontrado', logradouro: '', bairro: 'Centro', localidade: 'Alguma Cidade', uf: 'SP' });
  });

  test('CEP com formato válido mas inexistente: ViaCEP responde 200 com { erro: true }', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) });

    const resultado = await cepService.consultarCep('99999999');

    expect(resultado).toEqual({ status: 'nao_encontrado' });
  });

  test('falha de rede (timeout/DNS/conexão recusada): não lança, devolve "indisponivel"', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('falha de rede simulada'));

    const resultado = await cepService.consultarCep('02006000');

    expect(resultado).toEqual({ status: 'indisponivel' });
  });

  test('resposta HTTP de erro (5xx/4xx do próprio ViaCEP): devolve "indisponivel"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const resultado = await cepService.consultarCep('02006000');

    expect(resultado).toEqual({ status: 'indisponivel' });
  });

  test('resposta que não é JSON válido: devolve "indisponivel" em vez de lançar', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('corpo não é JSON'); },
    });

    const resultado = await cepService.consultarCep('02006000');

    expect(resultado).toEqual({ status: 'indisponivel' });
  });
});
