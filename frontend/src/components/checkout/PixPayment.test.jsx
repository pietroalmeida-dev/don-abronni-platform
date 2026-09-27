import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PixPayment from './PixPayment';
import Toast from '../common/Toast';
import { ToastProvider } from '../../contexts/ToastContext';
import { paymentService } from '../../services/paymentService';
import { ordersService } from '../../services/ordersService';

vi.mock('../../services/paymentService', () => ({
  paymentService: { criarPagamento: vi.fn() },
}));
vi.mock('../../services/ordersService', () => ({
  ordersService: { updateStatus: vi.fn(), getStatus: vi.fn() },
}));

function renderPix(props = {}) {
  const onFinish = vi.fn();
  const onCancel = vi.fn();
  render(
    <ToastProvider>
      <Toast />
      <PixPayment
        total={68.9}
        nota="DA-20260810-001"
        mensagemWhatsapp="mensagem-fake"
        onFinish={onFinish}
        onCancel={onCancel}
        {...props}
      />
    </ToastProvider>
  );
  return { onFinish, onCancel };
}

describe('PixPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getStatus é chamado em polling — por padrão devolve "ainda pendente" pra não
    // quebrar os testes que não têm interesse nesse comportamento específico.
    ordersService.getStatus.mockResolvedValue({ ok: true, dados: { statusPagamento: 'pendente', transacaoStatus: 'pendente' } });
  });

  it('mostra "gerando QR Code" e depois o valor, o QR real e o timer', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
    renderPix();

    expect(screen.getByText(/gerando qr code/i)).toBeInTheDocument();

    expect(await screen.findByText('R$ 68,90')).toBeInTheDocument();
    expect(screen.getByText('chave-pix-fake-123')).toBeInTheDocument();
    expect(screen.getByText(/expira em 30:00/i)).toBeInTheDocument();
    expect(screen.getByText(/aguardando a confirmação automática/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /já paguei/i })).not.toBeInTheDocument();
  });

  it('usa o QR Code de imagem real (base64) devolvido pelo backend, quando presente', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: 'ZmFrZQ==', linkPagamento: null, status: 'pendente' } });
    renderPix();

    const imagem = await screen.findByAltText('QR Code Pix');
    expect(imagem).toHaveAttribute('src', 'data:image/png;base64,ZmFrZQ==');
  });

  it('falha ao gerar o Pix: mostra a tela alternativa com as duas opções (o pedido já foi registrado)', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: false, erro: 'Serviço de pagamento indisponível.' });
    renderPix();

    expect(await screen.findByText(/pix indisponível/i)).toBeInTheDocument();
    expect(screen.getByText(/serviço de pagamento indisponível/i)).toBeInTheDocument();
    expect(screen.getByText('DA-20260810-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar e pagar na entrega/i })).toBeInTheDocument();
  });

  it('"Enviar e pagar na entrega" (Pix indisponível): finaliza sem chamar updateStatus', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: false, erro: 'Serviço de pagamento indisponível.' });
    const user = userEvent.setup();
    const { onFinish } = renderPix();
    await screen.findByText(/pix indisponível/i);

    await user.click(screen.getByRole('button', { name: /enviar e pagar na entrega/i }));

    expect(ordersService.updateStatus).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith('mensagem-fake');
    expect(await screen.findByText(/enviado! combine o pagamento/i)).toBeInTheDocument();
  });

  it('copiar chave: copia o código Pix pra área de transferência e avisa', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
    const user = userEvent.setup();
    // jsdom não implementa navigator.clipboard, e user-event já instala o próprio
    // stub ao chamar setup() — espiona DEPOIS do setup() pra não ser sobrescrito.
    const escreverNaAreaDeTransferencia = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /copiar/i }));

    expect(escreverNaAreaDeTransferencia).toHaveBeenCalledWith('chave-pix-fake-123');
    expect(await screen.findByText('Código Pix copiado!')).toBeInTheDocument();
  });

  it('cancelar com sucesso: chama updateStatus com CANCELADO e onCancel', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
    ordersService.updateStatus.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const { onCancel } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(ordersService.updateStatus).toHaveBeenCalledWith('DA-20260810-001', 'cancelado');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cancelar com falha do backend: mostra o erro e NÃO chama onCancel (pedido continua ativo)', async () => {
    paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
    ordersService.updateStatus.mockResolvedValue({ ok: false, erro: 'Sessão expirada.' });
    const user = userEvent.setup();
    const { onCancel } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  // 🔒 Cobertura do novo fluxo real: a confirmação de pagamento não é mais um botão
  // "já paguei" que o cliente clica (autodeclaração, sem verificação nenhuma) — é
  // detectada por polling do status vindo do servidor, atualizado por sua vez pelo
  // webhook do gateway.
  describe('confirmação de pagamento via polling (webhook)', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('detecta pagamento aprovado automaticamente e chama onFinish, sem exigir nenhuma ação do cliente', async () => {
      paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
      const { onFinish } = renderPix();
      await vi.waitFor(() => expect(screen.getByText('chave-pix-fake-123')).toBeInTheDocument());

      ordersService.getStatus.mockResolvedValue({ ok: true, dados: { statusPagamento: 'pago', transacaoStatus: 'aprovado' } });
      await vi.advanceTimersByTimeAsync(4000);

      expect(onFinish).toHaveBeenCalledWith('mensagem-fake');
    });

    it('pagamento recusado detectado via polling: para de esperar e oferece cancelar ou seguir na entrega', async () => {
      paymentService.criarPagamento.mockResolvedValue({ ok: true, dados: { qrCode: 'chave-pix-fake-123', qrCodeBase64: null, linkPagamento: null, status: 'pendente' } });
      renderPix();
      await vi.waitFor(() => expect(screen.getByText('chave-pix-fake-123')).toBeInTheDocument());

      ordersService.getStatus.mockResolvedValue({ ok: true, dados: { statusPagamento: 'pendente', transacaoStatus: 'recusado' } });
      await vi.advanceTimersByTimeAsync(4000);

      expect(await screen.findByText(/pagamento não foi aprovado/i)).toBeInTheDocument();
    });
  });
});
