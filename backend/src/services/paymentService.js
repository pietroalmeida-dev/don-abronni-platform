'use strict';

const paymentGatewayRepository = require('../repositories/paymentGatewayRepository');
const pedidoRepository = require('../repositories/pedidoRepository');
const AppError = require('../utils/AppError');

// 🚨 Duas APIs do Mercado Pago, dois vocabulários de status para a mesma ideia de
// "aprovado": a API de Payments (cartão/Checkout Pro) usa `approved`; a API de
// Orders (Pix) usa `processed`. Confirmado testando manualmente contra a API real
// — nenhuma das duas documentações consultadas deixava isso claro sozinha.
const MAPA_STATUS_GATEWAY = {
  approved: 'aprovado',
  processed: 'aprovado',
  rejected: 'recusado',
  cancelled: 'cancelado',
};

function urlsDeRetorno(numeroNota) {
  const base = process.env.FRONTEND_URL;
  return {
    success: `${base}/?pagamento=retorno&nota=${numeroNota}`,
    failure: `${base}/?pagamento=falhou&nota=${numeroNota}`,
    pending: `${base}/?pagamento=pendente&nota=${numeroNota}`,
  };
}

function formatarResposta(transacao) {
  return {
    qrCode: transacao.qrCode || null,
    qrCodeBase64: transacao.qrCodeBase64 || null,
    linkPagamento: transacao.linkPagamento || null,
    status: transacao.status,
  };
}

const paymentService = {
  // 🔒 O valor cobrado nunca vem do corpo desta requisição — só existe
  // `pedido.total`, já recalculado a partir do catálogo em pedidoService.criar.
  // Por isso POST /api/pagamentos recebe só o numeroNota: não há campo `valor` em
  // lugar nenhum aqui para um cliente mal-intencionado adulterar.
  async criarPagamento({ numeroNota, usuario }) {
    const pedido = await pedidoRepository.buscarPorNumeroNota(numeroNota);
    if (!pedido || String(pedido.usuario) !== String(usuario._id)) {
      throw new AppError('Pedido não encontrado.', 404);
    }
    if (pedido.pagamento.forma === 'dinheiro') {
      throw new AppError('Pagamento em dinheiro não usa gateway — combine com a pizzaria na entrega.', 422);
    }
    if (pedido.pagamento.statusPagamento === 'pago') {
      throw new AppError('Este pedido já está pago.', 422);
    }

    // Reaproveita uma transação pendente do MESMO método em vez de criar uma nova
    // a cada vez que o cliente reabre a tela de pagamento (ex.: fechou e voltou
    // pro checkout) — evita acumular QR Codes/preferências órfãs no painel do
    // Mercado Pago para o mesmo pedido.
    const transacaoExistente = pedido.transacao;
    const aindaValida = transacaoExistente && (!transacaoExistente.expiraEm || transacaoExistente.expiraEm > new Date());
    if (transacaoExistente && transacaoExistente.metodo === pedido.pagamento.forma && transacaoExistente.status === 'pendente' && aindaValida) {
      return formatarResposta(transacaoExistente);
    }

    const emailCliente = pedido.clienteEmail;
    let transacao;

    if (pedido.pagamento.forma === 'pix') {
      const dados = await paymentGatewayRepository.criarPagamentoPix({ valor: pedido.total, numeroNota, emailCliente });
      transacao = {
        gateway: 'mercadopago',
        metodo: 'pix',
        pagamentoId: dados.pagamentoId,
        valor: pedido.total,
        status: MAPA_STATUS_GATEWAY[dados.status] || 'pendente',
        qrCode: dados.qrCode,
        qrCodeBase64: dados.qrCodeBase64,
        expiraEm: dados.expiraEm,
      };
    } else {
      const dados = await paymentGatewayRepository.criarPreferenciaCartao({
        valor: pedido.total,
        numeroNota,
        emailCliente,
        notificationUrl: process.env.MERCADOPAGO_NOTIFICATION_URL,
        backUrls: urlsDeRetorno(numeroNota),
      });
      transacao = {
        gateway: 'mercadopago',
        metodo: 'cartao',
        pagamentoId: String(dados.pagamentoId),
        valor: pedido.total,
        status: 'pendente',
        linkPagamento: dados.linkPagamento,
      };
    }

    await pedidoRepository.atualizarTransacao(numeroNota, transacao);
    return formatarResposta(transacao);
  },

  // Chamado pela rota pública de webhook (fora do middleware de autenticação JWT —
  // o gateway não tem, e não pode ter, um token de usuário nosso). A validação de
  // assinatura abaixo é a única coisa que impede qualquer um na internet de forjar
  // "pagamento aprovado" para qualquer numeroNota.
  async processarWebhook({ dataId, tipo, xSignature, xRequestId }) {
    const assinaturaValida = paymentGatewayRepository.validarAssinaturaWebhook({
      xSignature,
      xRequestId,
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    });
    if (!assinaturaValida) {
      throw new AppError('Assinatura inválida.', 401);
    }

    if (!dataId) return;

    // 🚨 Cartão (Checkout Pro/Preference) notifica no tópico "payment", com o id
    // de um pagamento clássico. Pix (Orders) notifica no tópico "order", com o id
    // da ORDEM — são recursos diferentes, com endpoints e formas de buscar
    // diferentes (ver paymentGatewayRepository.buscarPagamento vs. buscarOrder).
    // Qualquer outro tópico (ex.: "merchant_order") é ignorado silenciosamente —
    // não é um erro, só não é o que processamos aqui. Sempre responde 200 pra
    // esses (ver paymentController.webhook) — um erro faria o Mercado Pago
    // reenviar a notificação repetidamente à toa.
    let numeroNota;
    let pagamentoId;
    let statusBruto;

    if (tipo === 'payment') {
      const pagamento = await paymentGatewayRepository.buscarPagamento(dataId);
      numeroNota = pagamento.external_reference;
      pagamentoId = String(pagamento.id);
      statusBruto = pagamento.status;
    } else if (tipo === 'order') {
      const order = await paymentGatewayRepository.buscarOrder(dataId);
      numeroNota = order.external_reference;
      const pagamentoDaOrdem = order.transactions?.payments?.[0];
      pagamentoId = pagamentoDaOrdem?.id ? String(pagamentoDaOrdem.id) : String(order.id);
      statusBruto = pagamentoDaOrdem?.status || order.status;
    } else {
      return;
    }

    if (!numeroNota) return;

    const pedido = await pedidoRepository.buscarPorNumeroNota(numeroNota);
    if (!pedido || !pedido.transacao) return;

    const novoStatus = MAPA_STATUS_GATEWAY[statusBruto] || pedido.transacao.status;
    const transacaoAtualizada = { ...pedido.transacao.toObject(), pagamentoId, status: novoStatus };

    if (novoStatus === 'aprovado') {
      // Idempotente: se uma notificação anterior (o Mercado Pago reenvia a mesma
      // notificação de vez em quando, por design) já tiver marcado como pago, a
      // condição `statusPagamento !== 'pago'` do repository garante que esta
      // segunda chamada não faz nada de novo.
      await pedidoRepository.confirmarPagamentoSeAindaPendente(numeroNota, transacaoAtualizada);
    } else {
      await pedidoRepository.atualizarTransacao(numeroNota, transacaoAtualizada);
    }
  },
};

module.exports = paymentService;
