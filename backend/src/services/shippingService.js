'use strict';

const { limparCep, cepValido } = require('../utils/cep');
const { normalizarTexto } = require('../utils/texto');
const { haversineKm } = require('../utils/geo');
const { TABELA_FRETE, RAIO_MAXIMO_KM, LOJA_COORDENADAS } = require('../config/pedidoConfig');
const cepService = require('./cepService');
const geocodingService = require('./geocodingService');
const routingService = require('./routingService');

const CIDADE_ATENDIDA = 'São Paulo';
const UF_ATENDIDA = 'SP';

// Erro residual medido de geocodificação/roteamento gratuitos (ver README, seção
// "Frete" — comparação manual com Google Maps encontrou ~100-600m de diferença,
// consistente em vários endereços reais testados). Quando a distância calculada
// cai dentro dessa margem de uma fronteira de faixa, cobramos a faixa de CIMA
// (mais cara) em vez da de baixo — decisão de negócio explícita: como a medição
// pode estar até ~400m otimista, "chutar pra cima" nunca deixa o motoboy cobrando
// barato demais por uma entrega que, na realidade, pode estar do outro lado da
// fronteira. Diferente da tentativa anterior (mexer nos VALORES da tabela): aqui
// o ajuste é sobre a DECISÃO de qual faixa usar, na fronteira exata onde a
// incerteza de medição realmente existe — não em toda a tabela.
const TOLERANCIA_FRONTEIRA_KM = 0.4;

function buscarFaixaPorDistancia(distanciaKm) {
  const indice = TABELA_FRETE.findIndex((f) => distanciaKm <= f.maxKm);
  if (indice === -1) return null; // passou até da última faixa -> fora do raio

  const faixa = TABELA_FRETE[indice];
  const distanciaAteFronteira = faixa.maxKm - distanciaKm;
  if (distanciaAteFronteira > TOLERANCIA_FRONTEIRA_KM) return faixa; // longe de qualquer fronteira, sem ambiguidade

  // Dentro da margem de erro conhecida: "chuta pra cima". Se existir uma próxima
  // faixa, cobra ela (mais cara). Se a faixa atual já É a última (fronteira do
  // raio de 10km), "cima" significa fora do raio de entrega — aplicado pela mesma
  // lógica, de propósito: um endereço a 9,7km está tecnicamente "dentro", mas com
  // ~400m de incerteza ele pode muito bem estar acima de 10km de verdade, e nesse
  // caso específico o erro mais caro pra empresa não é cobrar a mais, é assumir
  // uma entrega que não consegue cumprir.
  return TABELA_FRETE[indice + 1] || null;
}

function indisponivel(mensagem, distanciaKm = null) {
  return { distanciaKm, valor: null, entregaDisponivel: false, mensagem };
}

const shippingService = {
  // Fluxo: 1) valida o FORMATO do CEP (8 dígitos) — se inválido, devolve null
  // (contrato inalterado: freteController converte isso em 422); 2) confirma no
  // ViaCEP que o CEP EXISTE e pega o endereço canônico dele (rua/bairro/cidade);
  // 3) geocodifica esse endereço + o número da casa, se informado (Nominatim/
  // OpenStreetMap) para obter latitude/longitude — ver geocodingService para como
  // o número melhora a precisão quando o OSM tem essa informação mapeada; 4)
  // calcula a distância REAL de rota de moto/carro (OSRM) entre a loja e esse
  // ponto — não a distância "em linha reta" (Haversine só entra como fallback se o
  // OSRM estiver indisponível, ver abaixo); 5) usa essa distância pra achar a
  // faixa de preço na TABELA_FRETE já existente (inalterada) — se passar do maior
  // degrau da tabela (RAIO_MAXIMO_KM), está fora do raio de entrega (raio medido
  // em km DE ROTA, não em linha reta).
  //
  // `numero` é opcional (compatível com quem já chamava só com `cep`) — quando
  // informado, é usado só para melhorar a geocodificação, nunca aparece na
  // resposta nem é validado aqui (validação de "número obrigatório" continua no
  // formulário de endereço, não neste cálculo de frete).
  async calcularPorCep(cep, numero) {
    if (!cepValido(cep)) return null;

    const consulta = await cepService.consultarCep(limparCep(cep));

    if (consulta.status === 'indisponivel') {
      return indisponivel('Não foi possível verificar esse CEP agora. Tente novamente em instantes.');
    }
    if (consulta.status === 'nao_encontrado') {
      return indisponivel('CEP não encontrado. Confira e tente novamente.');
    }

    // Filtro rápido antes de gastar geocoding/roteamento: CEP de outra cidade nunca
    // vai estar dentro do raio de 10km de rota da loja mesmo.
    if (normalizarTexto(consulta.localidade) !== normalizarTexto(CIDADE_ATENDIDA) || consulta.uf !== UF_ATENDIDA) {
      return indisponivel(`Só entregamos em ${CIDADE_ATENDIDA}/${UF_ATENDIDA}.`);
    }

    const geo = await geocodingService.geocodificar({ ...consulta, numero });

    if (geo.status === 'indisponivel') {
      return indisponivel('Não foi possível calcular a distância agora. Tente novamente em instantes.');
    }
    if (geo.status === 'nao_encontrado') {
      return indisponivel('Não conseguimos localizar esse endereço no mapa. Confira o CEP e tente novamente.');
    }

    const distanciaKm = await obterDistanciaKm(geo.lat, geo.lon);

    // Arredondado com 2 casas (não 1) para exibição — com 1 casa, um valor como
    // 2.94km (que já cai na faixa "até 3.9km" na comparação abaixo, não na de
    // "até 2.9km") aparecia arredondado como "2.9 km" na tela, parecendo
    // inconsistente com o preço realmente cobrado. A DECISÃO de faixa sempre usa
    // `distanciaKm` sem nenhum arredondamento (linha abaixo) — só o número exibido
    // muda; arredondar não altera qual faixa é cobrada.
    const distanciaExibida = Number(distanciaKm.toFixed(2));

    const faixa = buscarFaixaPorDistancia(distanciaKm);
    if (!faixa) {
      return indisponivel(
        `Esse endereço está a ${distanciaExibida.toFixed(1)} km de rota da loja — fora do nosso raio de entrega (${RAIO_MAXIMO_KM} km).`,
        distanciaExibida
      );
    }

    return {
      distanciaKm: distanciaExibida,
      valor: faixa.valor,
      entregaDisponivel: true,
      bairro: consulta.bairro,
    };
  },
};

// Distância real de rota (OSRM) é a fonte principal. Se o serviço de rotas estiver
// indisponível (fora do ar, timeout — é um demo público gratuito, sem SLA), caímos
// de volta para a distância em linha reta (Haversine) em vez de travar o checkout
// inteiro por causa de um serviço externo de terceiros — o cliente ainda consegue
// calcular o frete e fechar o pedido, só que com uma aproximação um pouco menos
// precisa nesse cenário raro, em vez de nenhum frete calculável.
async function obterDistanciaKm(lat, lon) {
  const rota = await routingService.calcularDistanciaRota(LOJA_COORDENADAS.lat, LOJA_COORDENADAS.lon, lat, lon);
  if (rota.status === 'encontrado') return rota.distanciaKm;
  return haversineKm(LOJA_COORDENADAS.lat, LOJA_COORDENADAS.lon, lat, lon);
}

module.exports = shippingService;
