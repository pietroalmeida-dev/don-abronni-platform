'use strict';

require('./setup');
const request = require('supertest');
const app = require('../src/app');

// Mocka as três dependências de rede de shippingService (ViaCEP, geocoding e
// roteamento) — o teste controla exatamente o que cada uma devolve em cada
// cenário, sem depender de internet nem dos serviços reais estarem no ar (mesmo
// princípio já usado para emailService em recuperacaoSenha.test.js).
jest.mock('../src/services/cepService');
jest.mock('../src/services/geocodingService');
jest.mock('../src/services/routingService');
const cepService = require('../src/services/cepService');
const geocodingService = require('../src/services/geocodingService');
const routingService = require('../src/services/routingService');

// Coordenadas de exemplo (não importam em si — quem decide a distância nestes
// testes é o mock de routingService.calcularDistanciaRota, não o valor geográfico
// real). Usadas só pra simular que geocodingService encontrou "algum" ponto.
const UM_PONTO_QUALQUER = { lat: -23.5, lon: -46.6 };

describe('Frete — POST /api/frete/calcular', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CEP com formato inválido: 422, nem chega a consultar ViaCEP/geocoding/roteamento', async () => {
    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '123' });

    expect(resposta.status).toBe(422);
    expect(cepService.consultarCep).not.toHaveBeenCalled();
    expect(geocodingService.geocodificar).not.toHaveBeenCalled();
    expect(routingService.calcularDistanciaRota).not.toHaveBeenCalled();
  });

  test('CEP ausente no corpo da requisição: 422 (validação de campo obrigatório)', async () => {
    const resposta = await request(app).post('/api/frete/calcular').send({});
    expect(resposta.status).toBe(422);
  });

  test('CEP bem formatado mas que não existe: 200, entrega indisponível, sem chamar geocoding/roteamento', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'nao_encontrado' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '99999-999' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/não encontrado/i);
    expect(geocodingService.geocodificar).not.toHaveBeenCalled();
  });

  test('CEP existente mas de outra cidade/UF: fora da área, sem chamar geocoding/roteamento (filtro rápido)', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua X', bairro: 'Centro', localidade: 'Rio de Janeiro', uf: 'RJ' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '20000-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/são paulo/i);
    expect(geocodingService.geocodificar).not.toHaveBeenCalled();
  });

  test('endereço a 1.2km de ROTA da loja: dentro da 1ª faixa da TABELA_FRETE', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Perto', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 1.2 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(true);
    expect(resposta.body.distanciaKm).toBe(1.2);
    expect(resposta.body.valor).toBe(5); // TABELA_FRETE: até 2.9km = R$5
  });

  test('número da casa (opcional) é repassado para geocodingService, quando informado', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Perto', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 1.2 });

    await request(app).post('/api/frete/calcular').send({ cep: '05000-000', numero: '253' });

    expect(geocodingService.geocodificar).toHaveBeenCalledWith(expect.objectContaining({ numero: '253' }));
  });

  // Achado durante a investigação da diferença vs. Google Maps: a decisão de
  // faixa sempre usou a distância SEM arredondar (correta), mas o número EXIBIDO
  // era arredondado pra 1 casa — um valor real como 2.94km (que já cai na faixa
  // "até 3.9km") aparecia na tela como "2.9 km", parecendo cobrar errado. Passou a
  // exibir 2 casas.
  test('exibição com 2 casas decimais não muda a faixa cobrada, só corrige a aparência', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua X', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 2.94 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-000' });

    expect(resposta.body.distanciaKm).toBe(2.94); // não mais "2.9"
    expect(resposta.body.valor).toBe(6); // TABELA_FRETE: 2.94 > 2.9 -> cai na faixa "até 3.9km" = R$6, igual antes
  });

  test('endereço a 9.0km de ROTA da loja: dentro do raio e longe da fronteira, cai na última faixa (mais cara)', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Longe', bairro: 'Perus', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 9.0 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05100-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(true);
    expect(resposta.body.distanciaKm).toBe(9.0);
    expect(resposta.body.valor).toBe(20); // TABELA_FRETE: até 10.0km = R$20, longe da margem de 0.4km da fronteira
  });

  // Tolerância de fronteira (ver shippingService.buscarFaixaPorDistancia): dentro
  // de ~0.4km de uma fronteira interna, cobra a faixa de cima em vez da de baixo —
  // decisão de negócio pra nunca cobrar barato demais dentro da margem de erro
  // conhecida de geocodificação/roteamento.
  test('endereço a 2.6km (0.3km da fronteira de 2.9km): "chuta pra cima", cobra a faixa seguinte', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Perto Da Fronteira', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 2.6 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(true);
    expect(resposta.body.valor).toBe(6); // faixa "até 2.9km" seria R$5, mas a 0.3km da fronteira cobra a de cima (R$6)
  });

  test('endereço a 2.4km (0.5km da fronteira de 2.9km): fora da margem, cobra a faixa normal', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Longe Da Fronteira', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 2.4 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(true);
    expect(resposta.body.valor).toBe(5); // 0.5km da fronteira -> fora da margem de 0.4km, cobra normal
  });

  test('endereço a 9.7km (0.3km da fronteira de 10km, o limite do raio): "chuta pra cima" vira fora do raio', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua No Limite', bairro: 'Perus', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 9.7 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05100-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/fora do nosso raio/i);
  });

  test('endereço a 10.6km de ROTA da loja: fora do raio máximo de entrega (10km de rota, não linha reta)', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua Santana', bairro: 'Santana', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', ...UM_PONTO_QUALQUER });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'encontrado', distanciaKm: 10.6 });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '02403-010' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.valor).toBeNull();
    expect(resposta.body.mensagem).toMatch(/fora do nosso raio/i);
    expect(resposta.body.mensagem).toMatch(/rota/i); // deixa claro que o raio é medido por rota, não linha reta
  });

  test('OSRM (roteamento) indisponível: cai para Haversine (linha reta) em vez de travar o checkout', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua X', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    // mesmo ponto da loja -> Haversine dá ~0km
    geocodingService.geocodificar.mockResolvedValue({ status: 'encontrado', lat: -23.449455, lon: -46.718534 });
    routingService.calcularDistanciaRota.mockResolvedValue({ status: 'indisponivel' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '02985-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(true);
    expect(resposta.body.distanciaKm).toBeCloseTo(0, 1); // fallback Haversine calculou, não travou nem devolveu erro
    expect(resposta.body.valor).toBe(5);
  });

  test('CEP existe mas o endereço não é localizável no mapa: entrega indisponível, mensagem específica, sem chamar roteamento', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: '', bairro: '', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'nao_encontrado' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-001' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/não conseguimos localizar/i);
    expect(routingService.calcularDistanciaRota).not.toHaveBeenCalled();
  });

  test('ViaCEP indisponível: resposta amigável, rota não quebra', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'indisponivel' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '02006-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/não foi possível verificar/i);
  });

  test('geocoding indisponível: resposta amigável, rota não quebra, sem chamar roteamento', async () => {
    cepService.consultarCep.mockResolvedValue({ status: 'encontrado', logradouro: 'Rua X', bairro: 'Jaraguá', localidade: 'São Paulo', uf: 'SP' });
    geocodingService.geocodificar.mockResolvedValue({ status: 'indisponivel' });

    const resposta = await request(app).post('/api/frete/calcular').send({ cep: '05000-000' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.entregaDisponivel).toBe(false);
    expect(resposta.body.mensagem).toMatch(/não foi possível calcular a distância/i);
    expect(routingService.calcularDistanciaRota).not.toHaveBeenCalled();
  });
});
