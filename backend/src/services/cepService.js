'use strict';

// Único ponto do sistema que fala com o ViaCEP — e só para uma pergunta: "esse CEP
// existe e qual é o endereço dele (rua/bairro/cidade)?". Nunca é usado para
// calcular distância (o ViaCEP não sabe nada sobre isso) — quem faz isso é
// geocodingService (a partir do endereço textual devolvido aqui) + shippingService
// (que transforma a distância em valor de frete via TABELA_FRETE).
//
// Serviço gratuito, sem chave de API — mas também sem SLA. Por isso nunca deixamos
// uma falha dele (fora do ar, lento, resposta malformada) virar um erro 500 pro
// cliente: toda falha vira { status: 'indisponivel' }, que shippingService traduz
// numa mensagem clara ("tente novamente"), sem derrubar o checkout.
const TIMEOUT_MS = 4000;

const cepService = {
  async consultarCep(cepLimpo) {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    let resposta;
    try {
      resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, { signal: controlador.signal });
    } catch {
      // rede indisponível, timeout (abort) ou qualquer outra falha de transporte
      return { status: 'indisponivel' };
    } finally {
      clearTimeout(timeout);
    }

    if (!resposta.ok) return { status: 'indisponivel' };

    let dados;
    try {
      dados = await resposta.json();
    } catch {
      return { status: 'indisponivel' }; // resposta não veio como JSON válido
    }

    // Contrato do próprio ViaCEP: CEP com formato válido mas que não existe devolve
    // HTTP 200 com { erro: true }, não um 404.
    if (dados.erro) return { status: 'nao_encontrado' };

    return {
      status: 'encontrado',
      logradouro: dados.logradouro || '', // ex.: "Rua Baltazar de Campos" — nem todo CEP tem (alguns são só "CEP geral" de um bairro/cidade)
      bairro: dados.bairro || '',
      localidade: dados.localidade || '',
      uf: dados.uf || '',
    };
  },
};

module.exports = cepService;
