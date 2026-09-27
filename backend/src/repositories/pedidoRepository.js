'use strict';

const { Pedido } = require('../models');

const pedidoRepository = {
  async criar(dados) {
    return Pedido.create(dados);
  },
  // Sem paginação de verdade ainda (o painel admin não tem UI de página nenhuma) —
  // mas um `.limit()` alto evita que a coleção crescer sem limite vire uma consulta
  // cada vez mais pesada de "buscar tudo". Paginação real fica pro roadmap.
  async listarTodos() {
    return Pedido.find().sort({ createdAt: -1 }).limit(500);
  },
  async listarPorUsuario(usuarioId) {
    return Pedido.find({ usuario: usuarioId }).sort({ createdAt: -1 }).limit(200);
  },
  async buscarPorNumeroNota(numeroNota) {
    return Pedido.findOne({ numeroNota });
  },
  async atualizarStatus(numeroNota, status) {
    return Pedido.findOneAndUpdate({ numeroNota }, { status }, { returnDocument: 'after', runValidators: true });
  },
  async atualizarTransacao(numeroNota, transacao) {
    return Pedido.findOneAndUpdate({ numeroNota }, { transacao }, { returnDocument: 'after', runValidators: true });
  },

  // Atômico e condicional, mesmo padrão de cancelarSeForDoUsuarioERecebido abaixo:
  // só marca como pago se AINDA não estiver pago. É isso — não uma tabela separada
  // de "eventos de webhook já processados" — que torna inofensivo o gateway
  // reenviar a mesma notificação de pagamento aprovado mais de uma vez (documentado
  // como comportamento esperado pelo Mercado Pago).
  async confirmarPagamentoSeAindaPendente(numeroNota, transacaoAtualizada) {
    return Pedido.findOneAndUpdate(
      { numeroNota, 'pagamento.statusPagamento': { $ne: 'pago' } },
      { 'pagamento.statusPagamento': 'pago', transacao: transacaoAtualizada },
      { returnDocument: 'after', runValidators: true }
    );
  },

  // Projeção enxuta para polling do front-end (tela de Pix/retorno de cartão
  // perguntando "já confirmou?" a cada poucos segundos) — sem isso, cada consulta
  // traria o pedido inteiro (itens, endereço...) só para ler três campos.
  async buscarStatusPorNumeroNota(numeroNota) {
    return Pedido.findOne({ numeroNota }).select('numeroNota usuario status pagamento transacao');
  },

  // Update atômico e condicional: só cancela se o pedido AINDA for do usuário e
  // AINDA estiver 'recebido' no momento exato da escrita — elimina a janela de
  // corrida que existiria num "buscar → checar em JS → salvar" separado. Retorna
  // `null` se a condição não bateu (pedido de outro usuário, já mudou de status, ou
  // não existe) — quem chama decide a mensagem de erro sem saber qual desses foi.
  async cancelarSeForDoUsuarioERecebido(numeroNota, usuarioId) {
    return Pedido.findOneAndUpdate(
      { numeroNota, usuario: usuarioId, status: 'recebido' },
      { status: 'cancelado' },
      { returnDocument: 'after', runValidators: true }
    );
  },

  // Usado pela tela "Clientes" do painel admin. Uma única agregação do MongoDB em
  // vez de N consultas separadas (uma por usuário) — o clássico problema N+1.
  async agregarEstatisticasPorUsuario() {
    const resultado = await Pedido.aggregate([
      { $match: { usuario: { $ne: null } } },
      {
        $group: {
          _id: '$usuario',
          totalPedidos: { $sum: 1 },
          totalGasto: { $sum: '$total' },
          ultimaCompra: { $max: '$createdAt' },
        },
      },
    ]);
    return new Map(resultado.map((r) => [String(r._id), r]));
  },
};

module.exports = pedidoRepository;
