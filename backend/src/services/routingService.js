'use strict';

// Único ponto do sistema que fala com o OSRM (motor de rotas do OpenStreetMap,
// demo público — https://router.project-osrm.org, gratuito, sem chave de API) —
// transforma dois pontos (loja, cliente) na distância real percorrida pelas ruas
// entre eles, em vez da distância "em linha reta" (Haversine).
//
// Perfil usado: `driving` (carro). O demo público não tem um perfil dedicado de
// moto — `driving` é o substituto padrão nesse caso, porque moto trafega pela
// mesma malha viária que carro (ao contrário de `bike`, que em alguns lugares evita
// vias que uma moto usaria normalmente, ou de `foot`, que ignora vias totalmente
// diferentes). Ver README, seção "Frete", para a comparação completa de
// alternativas.
//
// 🚨 O demo público do OSRM é explicitamente "best-effort" (sem SLA, sem garantia
// de disponibilidade — ver https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)
// — adequado para um TCC, mas não para produção de verdade (nesse caso, seria
// necessário hospedar a própria instância do OSRM ou usar um serviço pago). Por
// isso nunca deixamos uma falha dele derrubar o checkout: shippingService cai de
// volta para Haversine (linha reta) se a rota não puder ser calculada.
const TIMEOUT_MS = 4500;
const BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

const routingService = {
  async calcularDistanciaRota(origemLat, origemLon, destinoLat, destinoLon) {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
      // OSRM usa longitude,latitude (nessa ordem) nas coordenadas da URL — invertido
      // em relação à convenção lat,lon usada no resto do nosso código.
      const url = `${BASE_URL}/${origemLon},${origemLat};${destinoLon},${destinoLat}?overview=false`;
      const resposta = await fetch(url, { signal: controlador.signal });
      if (!resposta.ok) return { status: 'indisponivel' };

      const dados = await resposta.json();
      if (dados.code !== 'Ok' || !dados.routes?.[0]) return { status: 'indisponivel' };

      return { status: 'encontrado', distanciaKm: dados.routes[0].distance / 1000 };
    } catch {
      return { status: 'indisponivel' }; // rede indisponível, timeout, ou resposta que não é JSON válido
    } finally {
      clearTimeout(timeout);
    }
  },
};

module.exports = routingService;
