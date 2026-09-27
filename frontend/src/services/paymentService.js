import { api } from './apiClient';
import { authService } from './authService';

function tokenCliente() {
  return authService.getSession()?.token;
}

// Chama o backend, que por sua vez fala com o gateway de pagamento real (Mercado
// Pago) — nenhuma chamada ao gateway acontece no navegador. Substitui o antigo QR
// code fictício gerado localmente (ver histórico deste arquivo); o contrato de
// resposta continua o mesmo dos dois lados: { qrCode, qrCodeBase64, linkPagamento, status }.
export const paymentService = {
  async criarPagamento(numeroNota) {
    try {
      const dados = await api.post('/pagamentos', { numeroNota }, tokenCliente());
      return { ok: true, dados };
    } catch (erro) {
      return { ok: false, erro: erro.message };
    }
  },
};
