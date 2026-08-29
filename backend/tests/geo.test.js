'use strict';

const { haversineKm } = require('../src/utils/geo');

describe('haversineKm', () => {
  test('mesmo ponto: distância zero', () => {
    expect(haversineKm(-23.449455, -46.718534, -23.449455, -46.718534)).toBe(0);
  });

  test('1 grau de latitude equivale a ~111km (referência conhecida)', () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
  });

  test('é simétrica (A->B == B->A)', () => {
    const ab = haversineKm(-23.449455, -46.718534, -23.5505, -46.6333);
    const ba = haversineKm(-23.5505, -46.6333, -23.449455, -46.718534);
    expect(ab).toBeCloseTo(ba, 6);
  });

  test('loja até um ponto ~10,6km de distância (validado contra o Nominatim real)', () => {
    // Loja (Rua Baltazar de Campos) -> ponto em Santana, ambos geocodificados de
    // verdade uma vez durante a implementação (não são coordenadas inventadas).
    const distancia = haversineKm(-23.449455, -46.718534, -23.4944879, -46.6263702);
    expect(distancia).toBeCloseTo(10.65, 1);
  });
});
