'use strict';

// Usado tanto por enderecoService (validar CEP de um endereço salvo) quanto por
// shippingService (calcular frete a partir do CEP) — antes cada um tinha sua
// própria cópia da mesma limpeza/checagem.
function limparCep(cep) {
  return (cep || '').replace(/\D/g, '');
}

function cepValido(cep) {
  return limparCep(cep).length === 8;
}

module.exports = { limparCep, cepValido };
