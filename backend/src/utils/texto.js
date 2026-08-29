'use strict';

// Usado para comparar textos ignorando acento e caixa — ex.: shippingService
// compara a "localidade" que o ViaCEP devolve ("São Paulo") com a cidade atendida
// pela pizzaria, sem se importar com acento/maiúscula/minúscula.
function normalizarTexto(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove os acentos (mantém a letra base)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

module.exports = { normalizarTexto };
