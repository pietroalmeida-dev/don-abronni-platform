'use strict';

// Constantes de negócio relacionadas a pedido/frete, antes espalhadas direto no
// código de `pedidoService.js` e `shippingService.js`. Centralizadas aqui para que
// trocar um valor (ex.: preço da borda recheada, faixas de frete) não exija caçar em
// qual service o número está escondido — e para deixar claro que são regras de
// negócio, não detalhe de implementação de um service específico.
//
// 🚨 Continuam sendo constantes no código (exigem deploy pra mudar), não uma
// configuração editável pelo admin em runtime — isso é uma limitação conhecida, não
// uma versão final. Ver README, seção "O que ainda é provisório".

const PRECO_BORDA_RECHEADA = 10.0;
const BORDAS_VALIDAS = ['nenhuma', 'catupiry', 'cheddar', 'chocolate'];

const TABELA_FRETE = [
  { maxKm: 2.9, valor: 5.0 },
  { maxKm: 3.9, valor: 6.0 },
  { maxKm: 4.9, valor: 7.0 },
  { maxKm: 5.9, valor: 8.0 },
  { maxKm: 6.9, valor: 9.0 },
  { maxKm: 7.9, valor: 10.0 },
  { maxKm: 8.9, valor: 15.0 },
  { maxKm: 10.0, valor: 20.0 },
];

// O maior "maxKm" da tabela acima já É o raio máximo de entrega — não duplicamos
// esse número numa segunda constante (evita as duas ficarem dessincronizadas se
// alguém editar só uma). Usado por shippingService só pra montar a mensagem de
// "fora do raio" com o número certo.
const RAIO_MAXIMO_KM = TABELA_FRETE[TABELA_FRETE.length - 1].maxKm;

// Coordenadas fixas da loja (ENDERECO_LOJA, mesmo endereço exibido no front-end:
// Rua Baltazar de Campos, 253 — Zona Norte, São Paulo/SP), obtidas geocodificando
// esse endereço uma única vez no Nominatim/OpenStreetMap (precisão de rua, não do
// número exato — o OSM nem sempre mapeia número de porta no Brasil, mas para uma
// distância de alguns km isso não muda a faixa de frete). shippingService usa isto
// como ponto de partida para calcular a distância (Haversine) até o endereço do
// cliente, também geocodificado. 🚨 Se a loja mudar de endereço, atualizar aqui.
const LOJA_COORDENADAS = { lat: -23.449455, lon: -46.718534 };

module.exports = { PRECO_BORDA_RECHEADA, BORDAS_VALIDAS, TABELA_FRETE, RAIO_MAXIMO_KM, LOJA_COORDENADAS };
