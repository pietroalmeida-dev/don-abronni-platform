'use strict';

// Script de demonstração pra apresentação — mostra, pra uma lista de distâncias
// de teste, qual faixa seria cobrada SEM tolerância de fronteira vs. COM (o que
// está implementado). Rodar com: node scripts/demo-tolerancia-fronteira.js
const { TABELA_FRETE } = require('../src/config/pedidoConfig');

const TOLERANCIA_FRONTEIRA_KM = 0.4;

function semTolerancia(distanciaKm) {
  return TABELA_FRETE.find((f) => distanciaKm <= f.maxKm) || null;
}

function comTolerancia(distanciaKm) {
  const indice = TABELA_FRETE.findIndex((f) => distanciaKm <= f.maxKm);
  if (indice === -1) return null;
  const faixa = TABELA_FRETE[indice];
  if (faixa.maxKm - distanciaKm > TOLERANCIA_FRONTEIRA_KM) return faixa;
  return TABELA_FRETE[indice + 1] || null;
}

const distanciasDeTeste = [1.2, 2.4, 2.6, 2.9, 4.8, 6.7, 8.6, 9.0, 9.7, 9.9, 10.5];

console.log('Distância | Faixa SEM tolerância | Faixa COM tolerância | Mudou?');
for (const km of distanciasDeTeste) {
  const antes = semTolerancia(km);
  const depois = comTolerancia(km);
  const valorAntes = antes ? `R$${antes.valor.toFixed(2)}` : 'fora do raio';
  const valorDepois = depois ? `R$${depois.valor.toFixed(2)}` : 'fora do raio';
  const mudou = valorAntes !== valorDepois ? `>>> SIM (${valorAntes} -> ${valorDepois})` : 'não';
  console.log(`${km.toFixed(1).padStart(9)} | ${valorAntes.padStart(20)} | ${valorDepois.padStart(20)} | ${mudou}`);
}
