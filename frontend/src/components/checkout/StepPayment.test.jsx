import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPayment from './StepPayment';

function setup(pagamentoInicial = { forma: 'pix', troco: '', obs: '' }) {
  const onNext = vi.fn();
  const onBack = vi.fn();
  const setPagamento = vi.fn();
  render(<StepPayment pagamento={pagamentoInicial} setPagamento={setPagamento} onNext={onNext} onBack={onBack} />);
  return { onNext, onBack, setPagamento };
}

describe('StepPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('começa com a forma de pagamento vinda de `pagamento` (estado do CheckoutModal)', () => {
    setup({ forma: 'cartao', troco: '', obs: '' });
    const radioCartao = screen.getByRole('radio', { name: /cartão/i });
    expect(radioCartao).toBeChecked();
  });

  it('escolher Pix mostra a chave Pix, sem campo de troco', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: /pix/i }));

    expect(screen.getByText(/chave pix da pizzaria/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/sem necessidade de troco/i)).not.toBeInTheDocument();
  });

  it('escolher Dinheiro mostra o campo "Troco para"', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('radio', { name: /dinheiro/i }));

    expect(screen.getByText('Troco para (opcional)')).toBeInTheDocument();
  });

  it('avançar envia forma de pagamento, troco e observação certos para o CheckoutModal', async () => {
    const user = userEvent.setup();
    const { onNext, setPagamento } = setup();

    await user.click(screen.getByRole('radio', { name: /dinheiro/i }));
    await user.type(screen.getByPlaceholderText('Ex: 50,00'), '100,00');
    await user.type(screen.getByPlaceholderText(/sem cebola/i), 'Sem cebola, por favor');
    await user.click(screen.getByRole('button', { name: /próximo/i }));

    expect(setPagamento).toHaveBeenCalledWith({ forma: 'dinheiro', troco: '100,00', obs: 'Sem cebola, por favor' });
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('"Voltar" chama onBack sem alterar o pagamento já escolhido', async () => {
    const user = userEvent.setup();
    const { onBack, setPagamento } = setup();

    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(onBack).toHaveBeenCalledOnce();
    expect(setPagamento).not.toHaveBeenCalled();
  });
});
