import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckoutModal from './CheckoutModal';
import Toast from '../common/Toast';
import { ToastProvider } from '../../contexts/ToastContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { authService } from '../../services/authService';
import { addressesService } from '../../services/addressesService';
import { shippingService } from '../../services/shippingService';
import { ordersService } from '../../services/ordersService';
import { paymentService } from '../../services/paymentService';

// CheckoutModal é o componente que "amarra" StepDelivery/StepPayment/StepConfirm/
// PixPayment — cada um já tem teste próprio isolado, mas nenhum teste até agora
// cobria a montagem real do pedido (montarItensDoPedido) nem a navegação entre os
// 3 passos de verdade. Mocka toda a fronteira de rede (5 services) pra isolar só
// essa "cola".
vi.mock('../../services/authService', () => ({
  authService: { getSession: vi.fn(), getAdminSession: vi.fn(() => null) },
}));
vi.mock('../../services/addressesService', () => ({
  addressesService: { getByUser: vi.fn() },
}));
vi.mock('../../services/shippingService', () => ({
  shippingService: { calcularPorCep: vi.fn() },
}));
vi.mock('../../services/ordersService', () => ({
  ordersService: { create: vi.fn(), updateStatus: vi.fn() },
}));
vi.mock('../../services/paymentService', () => ({
  paymentService: { criarPagamentoPix: vi.fn() },
}));

const sessaoCliente = { id: 'u1', name: 'Pietro Almeida', email: 'pietro@teste.com', role: 'cliente', token: 'tok' };
const enderecoSalvo = { _id: 'end1', rua: 'Av Fernando Mendes De Almeida', numero: '1061', complemento: 'casa 2', bairro: 'Parque Taipas', cep: '02987-100' };
const freteDisponivel = { valor: 8, distanciaKm: 3.2, entregaDisponivel: true };

const pizzaSimples = { id: 'p1', name: 'Pizza Margherita', price: 37.99, border: null, borderPrice: 0 };
const pizzaComBorda = { id: 'p2', name: 'Pizza Quatro Queijos', price: 52.9, border: 'Catupiry', borderPrice: 8 };

function AdicionaAoCarrinho({ itens }) {
  const { addToCart } = useCart();
  return <button data-testid="setup-add-all" onClick={() => itens.forEach((i) => addToCart(i))}>setup</button>;
}

function renderCheckout({ itensCarrinho = [pizzaSimples], onClose = vi.fn() } = {}) {
  render(
    <ToastProvider>
      <Toast />
      <AuthProvider>
        <CartProvider>
          <AdicionaAoCarrinho itens={itensCarrinho} />
          <CheckoutModal onClose={onClose} />
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
  return { onClose };
}

// Avança do passo 1 (Entrega) pro 2 (Pagamento), usando o endereço já salvo —
// evita preencher o formulário de endereço novo em todo teste que só quer chegar
// no passo de confirmação.
async function avancarParaPagamento(user) {
  await user.click(await screen.findByRole('button', { name: /próximo/i }));
}

describe('CheckoutModal — orquestração do pedido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authService.getSession.mockReturnValue(sessaoCliente);
    addressesService.getByUser.mockResolvedValue([enderecoSalvo]);
    shippingService.calcularPorCep.mockResolvedValue(freteDisponivel);
  });

  it('abre sempre no passo 1 (Entrega), com o indicador de passos correto', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    expect(await screen.findByText('Endereço de entrega')).toBeInTheDocument();
    expect(screen.getByText('1').closest('.checkout-step')).toHaveClass('active');
  });

  it('navega Entrega → Pagamento → Confirmar usando o endereço salvo', async () => {
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    await avancarParaPagamento(user);
    expect(await screen.findByText('Forma de pagamento')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /próximo/i }));
    expect(await screen.findByText('Resumo do pedido')).toBeInTheDocument();
  });

  it('monta o pedido corretamente: sabor único, borda em minúsculo, subtotal por item', async () => {
    ordersService.create.mockResolvedValue({ ok: true, pedido: { id: 'DA-20260810-001' } });
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'fake' } });
    const user = userEvent.setup();
    renderCheckout({ itensCarrinho: [pizzaComBorda] });
    await user.click(screen.getByTestId('setup-add-all'));

    await avancarParaPagamento(user);
    await user.click(await screen.findByRole('button', { name: /próximo/i })); // pagamento (fica em Pix, o padrão)
    await user.click(await screen.findByRole('button', { name: /confirmar e enviar/i }));

    expect(ordersService.create).toHaveBeenCalledOnce();
    const payload = ordersService.create.mock.calls[0][0];
    expect(payload.itens).toEqual([
      expect.objectContaining({
        produtoId: 'p2',
        nome: 'Pizza Quatro Queijos',
        tipo: 'unica',
        borda: 'catupiry', // era 'Catupiry' no carrinho — precisa vir minúsculo pro backend
        precoBorda: 8,
        quantidade: 1,
        subtotal: 60.9, // (52.90 + 8) * 1
      }),
    ]);
    expect(payload.entrega).toEqual({ tipo: 'delivery', endereco: enderecoSalvo, taxaEntrega: 8 });
    expect(payload.total).toBeCloseTo(68.9, 2); // subtotal 60.90 + frete 8
  });

  it('pagamento em Pix: mostra a tela de Pix (PixPayment) em vez de fechar o modal', async () => {
    ordersService.create.mockResolvedValue({ ok: true, pedido: { id: 'DA-20260810-002' } });
    paymentService.criarPagamentoPix.mockResolvedValue({ ok: true, dados: { qr_code: 'chave-fake-123' } });
    const user = userEvent.setup();
    const { onClose } = renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    await avancarParaPagamento(user);
    await user.click(await screen.findByRole('button', { name: /próximo/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar e enviar/i }));

    expect(await screen.findByText(/pagamento via pix/i)).toBeInTheDocument();
    // O modal continua aberto (é a tela de Pix que substitui o conteúdo) — onClose
    // só é chamado quando o cliente confirma o pagamento ou cancela.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pagamento em dinheiro/cartão: envia direto pro WhatsApp e fecha o modal, sem tela de Pix', async () => {
    ordersService.create.mockResolvedValue({ ok: true, pedido: { id: 'DA-20260810-003' } });
    const abrirJanela = vi.spyOn(window, 'open').mockImplementation(() => {});
    const user = userEvent.setup();
    const { onClose } = renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    await avancarParaPagamento(user);
    const secaoPagamento = (await screen.findByText('Forma de pagamento')).closest('.checkout-body');
    await user.click(within(secaoPagamento).getByRole('radio', { name: /dinheiro/i }));
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar e enviar/i }));

    expect(await screen.findByText(/enviado! aguarde confirmação/i)).toBeInTheDocument();
    expect(abrirJanela).toHaveBeenCalledWith(expect.stringContaining('wa.me'), '_blank');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByText(/pagamento via pix/i)).not.toBeInTheDocument();

    abrirJanela.mockRestore();
  });

  it('pedido recusado pelo backend: mostra o erro, permanece no passo 3 (não perde os dados já preenchidos)', async () => {
    ordersService.create.mockResolvedValue({ ok: false, erro: 'Estoque insuficiente para este item.' });
    const user = userEvent.setup();
    renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    await avancarParaPagamento(user);
    await user.click(await screen.findByRole('button', { name: /próximo/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar e enviar/i }));

    // Continua no resumo do pedido (não fechou nem avançou) — o cliente pode
    // tentar de novo sem preencher tudo outra vez.
    expect(await screen.findByText('Resumo do pedido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e enviar/i })).not.toBeDisabled();
  });

  // 🔒 CheckoutModal revalida a sessão no exato momento da confirmação, não só ao
  // abrir o modal — sem isso, alguém que perdeu a sessão no meio do checkout (token
  // expirado) ainda conseguiria mandar um pedido "autenticado" com dados antigos.
  it('sessão ausente no momento de confirmar: não cria o pedido, avisa e fecha o modal', async () => {
    authService.getSession.mockReturnValue(null); // já começa deslogado
    const user = userEvent.setup();
    const { onClose } = renderCheckout();
    await user.click(screen.getByTestId('setup-add-all'));

    // Sem sessão, addressesService.getByUser nunca é chamado (ver useEffect do
    // CheckoutModal), então não há endereço salvo — mas a navegação entre passos
    // não depende de sessão, só a confirmação final depende.
    await user.click(await screen.findByRole('radio', { name: /retirar/i }));
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await user.click(await screen.findByRole('button', { name: /próximo/i }));
    await user.click(await screen.findByRole('button', { name: /confirmar e enviar/i }));

    expect(ordersService.create).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
