'use strict';

// Unitário puro (mocka fetch) — mesmo padrão de cepService.test.js/geocodingService.test.js.
const routingService = require('../src/services/routingService');

describe('routingService.calcularDistanciaRota', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('rota encontrada: converte metros (OSRM) para km', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [{ distance: 16658, duration: 1335.4 }] }),
    });

    const resultado = await routingService.calcularDistanciaRota(-23.449455, -46.718534, -23.4944879, -46.6263702);

    expect(resultado).toEqual({ status: 'encontrado', distanciaKm: 16.658 });
  });

  test('monta a URL com longitude,latitude (convenção do OSRM, invertida da nossa)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 1000 }] }) });

    await routingService.calcularDistanciaRota(-23.449455, -46.718534, -23.5, -46.6);

    const urlChamada = global.fetch.mock.calls[0][0];
    expect(urlChamada).toContain('-46.718534,-23.449455'); // origem: lon,lat
    expect(urlChamada).toContain('-46.6,-23.5'); // destino: lon,lat
  });

  test('OSRM responde "sem rota" (code != "Ok"): status indisponivel, não lança', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) });

    const resultado = await routingService.calcularDistanciaRota(-23.449455, -46.718534, -23.5, -46.6);

    expect(resultado).toEqual({ status: 'indisponivel' });
  });

  test('falha de rede/timeout: status indisponivel, não lança', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('falha de rede simulada'));

    const resultado = await routingService.calcularDistanciaRota(-23.449455, -46.718534, -23.5, -46.6);

    expect(resultado).toEqual({ status: 'indisponivel' });
  });

  test('resposta HTTP de erro: status indisponivel', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const resultado = await routingService.calcularDistanciaRota(-23.449455, -46.718534, -23.5, -46.6);

    expect(resultado).toEqual({ status: 'indisponivel' });
  });
});
