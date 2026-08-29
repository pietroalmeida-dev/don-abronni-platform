'use strict';

const RAIO_TERRA_KM = 6371;

function paraRadianos(graus) {
  return (graus * Math.PI) / 180;
}

// Fórmula de Haversine: distância em linha reta ("como o pássaro voa") entre dois
// pontos de latitude/longitude — usada para decidir se um endereço está dentro do
// raio de entrega e para escolher a faixa de preço na TABELA_FRETE.
//
// 🚨 Não é a distância real que o motoboy percorre nas ruas (isso exigiria uma API
// de rotas real, ex. OpenRouteService/Google Routes — avaliado e descartado por
// enquanto: dependência externa a mais, sem necessidade real numa área de entrega
// pequena, onde a diferença entre "linha reta" e "rota real" raramente muda a faixa
// de preço). Ver README, seção "Frete".
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = paraRadianos(lat2 - lat1);
  const dLon = paraRadianos(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(paraRadianos(lat1)) * Math.cos(paraRadianos(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RAIO_TERRA_KM * c;
}

module.exports = { haversineKm };
