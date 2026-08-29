'use strict';

const avaliacaoRepository = require('../repositories/avaliacaoRepository');
const pedidoRepository = require('../repositories/pedidoRepository');
const AppError = require('../utils/AppError');

// Nunca expomos o nome completo do cliente numa rota pública — só o primeiro nome,
// o suficiente para um depoimento soar pessoal sem virar um dado identificável.
function primeiroNome(nomeCompleto) {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || 'Cliente';
}

const avaliacaoService = {
  async criar({ usuario, numeroNota, nota, comentario }) {
    const pedido = await pedidoRepository.buscarPorNumeroNota(numeroNota);
    // Mesma mensagem/status para "não existe" e "existe mas não é seu" — devolver
    // respostas diferentes (404 vs 403) deixaria qualquer conta autenticada varrer
    // números de nota e descobrir quais pedidos existem de verdade (ver mesma
    // correção em pedidoService.cancelarPeloCliente).
    if (!pedido || String(pedido.usuario) !== String(usuario._id)) {
      throw new AppError('Pedido não encontrado.', 404);
    }
    if (pedido.status !== 'entregue') {
      throw new AppError('Só é possível avaliar pedidos já entregues.', 422);
    }

    const existente = await avaliacaoRepository.buscarPorPedido(pedido._id);
    if (existente) throw new AppError('Este pedido já foi avaliado.', 409);

    // Number.isFinite: `nota < 1 || nota > 5` sozinho não barra `undefined`/valores
    // não numéricos (ambas comparações dão `false` em JS) — dependia só do
    // required/min/max do schema Mongoose pra pegar isso no `.save()`.
    if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
      throw new AppError('A nota deve ser um número entre 1 e 5.', 422);
    }

    return avaliacaoRepository.criar({ pedido: pedido._id, usuario: usuario._id, nota, comentario });
  },

  async listarTodas() {
    return avaliacaoRepository.listarTodas();
  },

  // Usado pelo histórico do cliente pra saber quais dos próprios pedidos já foram
  // avaliados (evita mostrar "Avaliar" de novo num pedido que já tem nota). Mapeia
  // pra `numeroNota` em vez de devolver o documento cru — o front nunca deveria
  // precisar conhecer o ObjectId interno do pedido, só o número da nota.
  async listarMinhas(usuarioId) {
    const avaliacoes = await avaliacaoRepository.listarPorUsuario(usuarioId);
    return avaliacoes.map((a) => ({
      numeroNota: a.pedido?.numeroNota,
      nota: a.nota,
      comentario: a.comentario,
    }));
  },

  // Rota pública (seção "Depoimentos" da home) — formata explicitamente o que sai,
  // em vez de devolver o documento do Mongoose direto, pra nunca vazar o id do
  // usuário/pedido nem o nome completo do cliente.
  async listarPublicas() {
    const avaliacoes = await avaliacaoRepository.listarRecentesComComentario(12);
    return avaliacoes.map((a) => ({
      id: a._id,
      nome: primeiroNome(a.usuario?.nome),
      nota: a.nota,
      comentario: a.comentario,
      data: a.createdAt,
    }));
  },
};

module.exports = avaliacaoService;
