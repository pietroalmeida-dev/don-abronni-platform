'use strict';

// Unitário puro (mocka fetch) — mesmo padrão de tests/cepService.test.js.
const geocodingService = require('../src/services/geocodingService');

describe('geocodingService.geocodificar', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  test('encontra na 1ª tentativa (rua + bairro): não tenta as outras', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: '-23.45', lon: '-46.71' }] });

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Baltazar de Campos', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP',
    });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.45, lon: -46.71 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Confirmado durante a investigação da diferença de 100-600m vs. Google Maps:
  // incluir o número da casa às vezes faz o Nominatim devolver o prédio exato
  // (classe `place`/`house`) em vez do meio da rua inteira — por isso é sempre a
  // primeira tentativa quando informado.
  test('com número informado: tenta "número + rua + bairro" primeiro', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: '-23.44', lon: '-46.72' }] });

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Cantagalo', bairro: 'Vila Prudente', localidade: 'São Paulo', uf: 'SP', numero: '100',
    });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.44, lon: -46.72 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const query = decodeURIComponent(global.fetch.mock.calls[0][0]);
    expect(query).toContain('100 Rua Cantagalo');
  });

  test('número informado mas o OSM não tem esse número mapeado: cai para "rua + bairro" sem número (nunca piora)', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // "100 Rua X, bairro" -> nada
      .mockResolvedValueOnce({ ok: true, json: async () => [{ lat: '-23.5', lon: '-46.6' }] }); // "Rua X, bairro" -> acha

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Doutor Assis Ribeiro', bairro: 'Vila Matilde', localidade: 'São Paulo', uf: 'SP', numero: '500',
    });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.5, lon: -46.6 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('sem número informado: primeira tentativa é direto "rua + bairro" (comportamento antigo intacto)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: '-23.45', lon: '-46.71' }] });

    await geocodingService.geocodificar({ logradouro: 'Rua X', bairro: 'Bairro Y', localidade: 'São Paulo', uf: 'SP' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const query = decodeURIComponent(global.fetch.mock.calls[0][0]);
    expect(query).toContain('q=Rua X, Bairro Y, São Paulo, SP, Brasil');
  });

  // Caso real encontrado durante a implementação: "Jardim São João (Jaraguá)" —
  // bairro com parênteses que o Nominatim não reconhecia combinado com a rua, mas
  // a rua sozinha (sem o bairro) encontrava certinho.
  test('rua + bairro não encontra nada (ex.: bairro com nome que o OSM não reconhece): cai para "rua sem bairro"', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // 1ª: rua+bairro, vazio
      .mockResolvedValueOnce({ ok: true, json: async () => [{ lat: '-23.44', lon: '-46.73' }] }); // 2ª: só rua+cidade

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Arroio da Seca', bairro: 'Jardim São João (Jaraguá)', localidade: 'São Paulo', uf: 'SP',
    });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.44, lon: -46.73 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // 2ª tentativa não deve incluir o bairro na query
    const segundaQuery = decodeURIComponent(global.fetch.mock.calls[1][0]);
    expect(segundaQuery).not.toContain('Jardim São João');
  });

  test('rua+bairro e rua sozinha não encontram nada: cai para a 3ª tentativa (só bairro)', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ lat: '-23.48', lon: '-46.72' }] });

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Muito Nova Sem Mapeamento', bairro: 'Pirituba', localidade: 'São Paulo', uf: 'SP',
    });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.48, lon: -46.72 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test('sem logradouro: pula direto para a busca por bairro (só 1 tentativa)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ lat: '-23.5', lon: '-46.6' }] });

    const resultado = await geocodingService.geocodificar({ logradouro: '', bairro: 'Moema', localidade: 'São Paulo', uf: 'SP' });

    expect(resultado).toEqual({ status: 'encontrado', lat: -23.5, lon: -46.6 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('nenhuma das tentativas encontra nada: "nao_encontrado"', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua Inexistente', bairro: 'Bairro Inexistente', localidade: 'São Paulo', uf: 'SP',
    });

    expect(resultado).toEqual({ status: 'nao_encontrado' });
  });

  test('sem bairro nem logradouro: nem tenta chamar a API, "nao_encontrado"', async () => {
    global.fetch = jest.fn();

    const resultado = await geocodingService.geocodificar({ logradouro: '', bairro: '', localidade: 'São Paulo', uf: 'SP' });

    expect(resultado).toEqual({ status: 'nao_encontrado' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('falha de transporte numa tentativa: propaga "indisponivel" na hora, não tenta as próximas', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('falha de rede simulada'));

    const resultado = await geocodingService.geocodificar({
      logradouro: 'Rua X', bairro: 'Bairro Y', localidade: 'São Paulo', uf: 'SP',
    });

    expect(resultado).toEqual({ status: 'indisponivel' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
