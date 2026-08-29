'use strict';

// Único ponto do sistema que fala com o Nominatim (geocoder do OpenStreetMap) —
// transforma um endereço em texto (vindo do ViaCEP) em latitude/longitude. Gratuito
// e sem chave de API, mas com duas exigências da política de uso deles
// (https://operations.osmfoundation.org/policies/nominatim/): identificar a
// aplicação num header User-Agent (não dá pra usar o padrão anônimo do fetch) e no
// máximo 1 requisição/segundo — folgado pro volume de um checkout de pizzaria.
const USER_AGENT = 'DonAbronniPizzaria-TCC/1.0 (projeto academico; sem contato publico)';
const TIMEOUT_MS = 3500;
const BASE_URL = 'https://nominatim.openstreetmap.org/search';

// Busca livre (endereço em texto). Devolve o array de resultados do Nominatim, ou
// `null` se a chamada falhou no nível de transporte (rede/timeout/HTTP/JSON) — só
// nesse caso ('null') consideramos o serviço indisponível; um array vazio é uma
// resposta válida (endereço não encontrado), não uma falha.
async function buscar(query) {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const url = `${BASE_URL}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const resposta = await fetch(url, { signal: controlador.signal, headers: { 'User-Agent': USER_AGENT } });
    if (!resposta.ok) return null;
    return await resposta.json();
  } catch {
    return null; // rede indisponível, timeout, ou resposta que não é JSON válido
  } finally {
    clearTimeout(timeout);
  }
}

function paraLatLon(resultadoNominatim) {
  return { status: 'encontrado', lat: parseFloat(resultadoNominatim.lat), lon: parseFloat(resultadoNominatim.lon) };
}

// Tenta uma lista de queries em ordem, na primeira que encontrar algo. `null`
// (falha de transporte) propaga imediatamente como indisponível — não faz sentido
// tentar as próximas se o próprio Nominatim está fora do ar. Um array vazio (endereço
// não encontrado NESSA tentativa específica) passa para a próxima tentativa.
async function tentarEmOrdem(queries) {
  for (const query of queries) {
    const resultado = await buscar(query);
    if (resultado === null) return { status: 'indisponivel' };
    if (resultado.length > 0) return paraLatLon(resultado[0]);
  }
  return { status: 'nao_encontrado' };
}

const geocodingService = {
  // Recebe o endereço já "canonizado" pelo ViaCEP (logradouro/bairro/cidade/uf),
  // mais o número da casa quando o cliente informou (opcional), e tenta localizá-lo
  // em até 4 tentativas, na ordem abaixo. A ordem não é arbitrária — foi definida
  // testando endereços reais de São Paulo contra o Nominatim durante a
  // implementação:
  //
  // 0) NÚMERO + rua + bairro + cidade (só quando `numero` é informado) — o mais
  //    preciso possível: quando o OSM tem o número da casa mapeado, o resultado
  //    muda de "ponto no meio da rua inteira" (classe `highway`) para o prédio de
  //    verdade (classe `place`/`house`), testado e confirmado durante a
  //    implementação. Quando o OSM NÃO tem esse número mapeado (comum em ruas
  //    residenciais menos centrais), a busca simplesmente não encontra nada e cai
  //    pra tentativa 1 — nunca piora o resultado, só melhora quando o dado existe.
  // 1) rua + bairro + cidade (mais preciso disponível sem número, quando o nome do
  //    bairro bate com o OSM)
  // 2) rua + cidade, sem bairro (corrige os casos em que o bairro do ViaCEP não é
  //    reconhecido pelo OSM, ou tem caracteres que atrapalham a busca — 2 dos 10
  //    endereços testados na implementação só foram resolvidos assim)
  // 3) só bairro + cidade (última tentativa — usada quando o CEP não tem
  //    logradouro específico, ex.: CEPs "gerais" de bairro/cidade pequena)
  async geocodificar({ logradouro, bairro, localidade, uf, numero }) {
    const queries = [];
    if (numero && logradouro && bairro) queries.push(`${numero} ${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`);
    if (logradouro && bairro) queries.push(`${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`);
    if (logradouro) queries.push(`${logradouro}, ${localidade}, ${uf}, Brasil`);
    if (bairro) queries.push(`${bairro}, ${localidade}, ${uf}, Brasil`);

    if (queries.length === 0) return { status: 'nao_encontrado' };
    return tentarEmOrdem(queries);
  },
};

module.exports = geocodingService;
