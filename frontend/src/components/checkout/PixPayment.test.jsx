import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PixPayment from './PixPayment';
import Toast from '../common/Toast';
import { ToastProvider } from '../../contexts/ToastContext';
import { paymentService } from '../../services/paymentService';
import { ordersService } from '../../services/ordersService';

vi.mock('../../services/paymentService', () => ({
  paymentService: { criarPagamentoPix: vi.fn() },
}));
vi.mock('../../services/ordersService', () => ({
  ordersService: { updateStatus: vi.fn() },
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
        emailCliente="pietro@teste.com"
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
  });

  it('mostra "gerando QR Code" e depois o valor, a chave e o timer', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
    renderPix();

    expect(screen.getByText(/gerando qr code/i)).toBeInTheDocument();

    expect(await screen.findByText('R$ 68,90')).toBeInTheDocument();
    expect(screen.getByText('chave-pix-fake-123')).toBeInTheDocument();
    expect(screen.getByText(/expira em 30:00/i)).toBeInTheDocument();
  });

  it('falha ao gerar o Pix: mostra a tela alternativa com as duas opções (o pedido já foi registrado)', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: false, erro: 'Serviço de pagamento indisponível.' });
    renderPix();

    expect(await screen.findByText(/pix indisponível/i)).toBeInTheDocument();
    expect(screen.getByText(/serviço de pagamento indisponível/i)).toBeInTheDocument();
    expect(screen.getByText('DA-20260810-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar e pagar na entrega/i })).toBeInTheDocument();
  });

  it('"Enviar e pagar na entrega" (Pix indisponível): finaliza sem chamar updateStatus', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: false, erro: 'Serviço de pagamento indisponível.' });
    const user = userEvent.setup();
    const { onFinish } = renderPix();
    await screen.findByText(/pix indisponível/i);

    await user.click(screen.getByRole('button', { name: /enviar e pagar na entrega/i }));

    expect(ordersService.updateStatus).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledWith('mensagem-fake');
    expect(await screen.findByText(/enviado! combine o pagamento/i)).toBeInTheDocument();
  });

  it('copiar chave: copia o código Pix pra área de transferência e avisa', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
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

  // 🔒 Cobertura do bug corrigido nesta revisão: handleCancelar/handleJaPaguei
  // ignoravam o retorno { ok, erro } de updateStatus.
  it('cancelar com sucesso: chama updateStatus com CANCELADO e onCancel', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
    ordersService.updateStatus.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const { onCancel } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(ordersService.updateStatus).toHaveBeenCalledWith('DA-20260810-001', 'cancelado');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('cancelar com falha do backend: mostra o erro e NÃO chama onCancel (pedido continua ativo)', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
    ordersService.updateStatus.mockResolvedValue({ ok: false, erro: 'Sessão expirada.' });
    const user = userEvent.setup();
    const { onCancel } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(await screen.findByText('Sessão expirada.')).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('já paguei com sucesso: chama updateStatus com RECEBIDO e onFinish', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
    ordersService.updateStatus.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    const { onFinish } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /já paguei/i }));

    expect(ordersService.updateStatus).toHaveBeenCalledWith('DA-20260810-001', 'recebido');
    expect(onFinish).toHaveBeenCalledWith('mensagem-fake');
  });

  it('já paguei com falha do backend: mostra o erro, reabilita o botão e NÃO chama onFinish', async () => {
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-pix-fake-123' } });
    ordersService.updateStatus.mockResolvedValue({ ok: false, erro: 'Falha de conexão.' });
    const user = userEvent.setup();
    const { onFinish } = renderPix();
    await screen.findByText('chave-pix-fake-123');

    await user.click(screen.getByRole('button', { name: /já paguei/i }));

    expect(await screen.findByText('Falha de conexão.')).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /já paguei/i })).not.toBeDisabled();
  });
});
