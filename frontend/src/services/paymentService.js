// 🚨 PROVISÓRIO: sem gateway de pagamento real — nem aqui, nem no backend (ver
// aviso 🚨 em src/services/paymentService.js do backend). Antes esta função chamava
// um servidor local inexistente (http://localhost:3000/create-pix-payment), o que na
// prática fazia todo pagamento Pix cair no estado de erro. Gera o código fictício
// localmente agora, no mesmo espírito do paymentService do backend, até um gateway
// de verdade existir dos dois lados.
function chaveFicticia() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const paymentService = {
  async criarPagamentoPix(valor) {
    const qrCode = `00020126PIX-FICTICIO-${chaveFicticia()}5204000053039865802BR`;
    return { ok: true, dados: { qr_code: qrCode, valor } };
  },
};
