'use strict';

const { MercadoPagoConfig, Order, Payment, Preference, WebhookSignatureValidator, InvalidWebhookSignatureError } = require('mercadopago');

// Ponto único de integração com o Mercado Pago — nada fora deste arquivo conhece a
// SDK ou o formato de resposta do gateway (mesmo princípio do antigo
// paymentService fictício: isolar a peça que muda se um dia o gateway trocar para
// PagSeguro, Efí etc. — só este repository seria reescrito).
function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado. Ver .env.example.');
  }
  return new MercadoPagoConfig({ accessToken });
}

const paymentGatewayRepository = {
  // 🚨 Usa a API de Orders (`Order.create`), não a API de Payments antiga
  // (`Payment.create`) — o Mercado Pago migrou a criação de Pix pra cá; a API de
  // Payments direta responde "Unauthorized use of live credentials" com uma
  // credencial de usuário de teste atual, mesmo sendo uma credencial de teste
  // legítima (confirmado testando manualmente contra a API real). A ordem criada
  // ainda gera um pagamento clássico por baixo dos panos — é esse id numérico que
  // chega no webhook e que `buscarPagamento`/`Payment.get` continuam sabendo ler.
  // `external_reference` (numeroNota) é propagado da ordem pro pagamento
  // automaticamente pelo Mercado Pago — é assim que o webhook, recebendo só um id
  // de pagamento, sabe a qual pedido nosso ele pertence.
  async criarPagamentoPix({ valor, numeroNota, emailCliente }) {
    const order = new Order(client());
    const expiraEm = new Date(Date.now() + 30 * 60 * 1000);

    const resultado = await order.create({
      body: {
        type: 'online',
        total_amount: valor.toFixed(2),
        external_reference: numeroNota,
        transactions: {
          payments: [
            {
              amount: valor.toFixed(2),
              payment_method: { id: 'pix', type: 'bank_transfer' },
              expiration_time: 'PT30M',
            },
          ],
        },
        payer: { email: emailCliente || 'cliente@donabronni.com' },
      },
      // Sem isso, uma segunda chamada pro mesmo pedido (ex.: duas abas, ou o efeito
      // do React rodando 2x no modo dev) criaria uma SEGUNDA cobrança Pix de
      // verdade no Mercado Pago — a checagem de "reaproveitar transação pendente"
      // em paymentService já cobre o caso comum, mas só depois que a primeira
      // chamada já tiver salvo no banco; a chave de idempotência cobre a janela de
      // corrida entre duas chamadas simultâneas antes disso acontecer.
      requestOptions: { idempotencyKey: `pix-${numeroNota}` },
    });

    const pagamento = resultado.transactions?.payments?.[0] || {};
    const dadosPix = pagamento.payment_method || {};
    return {
      pagamentoId: pagamento.id ? String(pagamento.id) : String(resultado.id),
      status: pagamento.status, // 'action_required' (aguardando) | 'approved' | 'rejected' | ...
      qrCode: dadosPix.qr_code || null,
      qrCodeBase64: dadosPix.qr_code_base64 || null,
      expiraEm,
    };
  },

  // Cartão usa Checkout Pro (Preference): o cliente é redirecionado para uma
  // página hospedada pelo próprio Mercado Pago para digitar os dados do cartão —
  // eles nunca passam pelo nosso servidor nem pelo nosso front-end, o que tira este
  // projeto inteiramente do escopo de PCI-DSS (armazenar/transmitir dado de
  // cartão).
  async criarPreferenciaCartao({ valor, numeroNota, emailCliente, notificationUrl, backUrls }) {
    const preference = new Preference(client());
    // 🚨 `auto_return` exige que `back_urls.success` seja uma URL PUBLICAMENTE
    // alcançável — com uma URL `localhost` (desenvolvimento local, sem túnel), o
    // Mercado Pago recusa a criação inteira da preferência com
    // "auto_return invalid. back_url.success must be defined". Sem `auto_return`,
    // o cliente só precisa clicar num botão "Voltar ao site" após pagar, em vez de
    // ser redirecionado sozinho — pior experiência, mas não impede o pagamento.
    const successUrlPublica = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(backUrls?.success || '') === false;
    const resultado = await preference.create({
      body: {
        items: [{ title: `Pedido ${numeroNota} — Don Abronni Pizzaria`, quantity: 1, unit_price: valor, currency_id: 'BRL' }],
        payer: emailCliente ? { email: emailCliente } : undefined,
        external_reference: numeroNota,
        notification_url: notificationUrl,
        back_urls: backUrls,
        ...(successUrlPublica ? { auto_return: 'approved' } : {}),
      },
      requestOptions: { idempotencyKey: `cartao-${numeroNota}` },
    });

    // 🚨 NUNCA usar `sandbox_init_point` — o Mercado Pago descontinuou o ambiente
    // de sandbox como domínio separado (removido em 2026): hoje só existe UM
    // endpoint, e usar `sandbox_init_point` com uma credencial atual devolve 403.
    // A diferença entre um teste e uma cobrança de verdade está inteiramente em
    // QUAL credencial está em MERCADOPAGO_ACCESS_TOKEN (token de um usuário de
    // teste vs. token da conta real), nunca na URL do link de pagamento.
    return {
      pagamentoId: resultado.id,
      linkPagamento: resultado.init_point,
    };
  },

  // Usado pelo webhook (tópico "payment", vindo do Checkout Pro/cartão): a
  // notificação em si só traz um id, nunca o status real — é preciso buscar o
  // recurso completo pra saber se foi aprovado, recusado etc.
  async buscarPagamento(pagamentoId) {
    const payment = new Payment(client());
    return payment.get({ id: pagamentoId });
  },

  // Usado pelo webhook (tópico "order", vindo da Order/Pix): diferente do
  // Checkout Pro, a API de Orders notifica com o id da ORDEM, não de um
  // pagamento — buscar por `Payment.get` com esse id dá 404 (são recursos e ids
  // diferentes). O status "de sucesso" aqui também tem outro nome: `processed`/
  // `accredited`, não `approved` como na API de Payments (ver MAPA_STATUS_GATEWAY
  // em paymentService.js).
  async buscarOrder(orderId) {
    const order = new Order(client());
    return order.get({ id: orderId });
  },

  // Delega para o validador oficial embutido na própria SDK do Mercado Pago (em
  // vez de reimplementar o HMAC na mão) — ele cobre casos que uma implementação
  // caseira facilmente erraria (cabeçalho ausente/malformado, comparação em tempo
  // constante) e ainda aceita uma janela de tolerância de horário, rejeitando uma
  // assinatura genuína capturada e reenviada bem mais tarde (replay). É a ÚNICA
  // barreira de segurança da rota de webhook — ela não passa por autenticação JWT,
  // o gateway não tem (e não pode ter) token de nenhum usuário nosso.
  // https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
  validarAssinaturaWebhook({ xSignature, xRequestId, dataId, secret }) {
    if (!secret) return false;
    try {
      WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret, toleranceSeconds: 5 * 60 });
      return true;
    } catch (erro) {
      if (erro instanceof InvalidWebhookSignatureError) return false;
      throw erro;
    }
  },
};

module.exports = paymentGatewayRepository;
