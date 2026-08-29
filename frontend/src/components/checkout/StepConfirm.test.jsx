import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepConfirm from './StepConfirm';

const pizzaMargherita = { id: 'p1', name: 'Pizza Margherita', price: 37.99, quantity: 1 };
const pizzaComBorda = { id: 'p2', name: 'Pizza Quatro Queijos', price: 52.9, border: 'Catupiry', borderPrice: 8, quantity: 2 };

const enderecoEntrega = { tipo: 'delivery', taxaEntrega: 8, endereco: { rua: 'Av Fernando Mendes De Almeida', numero: '1061', complemento: 'casa 2', bairro: 'Parque Taipas' } };
const retiradaLocal = { tipo: 'retirada', taxaEntrega: 0, endereco: null };

function setup({ cart = [pizzaMargherita], entrega = enderecoEntrega, pagamento = { forma: 'pix', troco: '', obs: '' }, enviando = false } = {}) {
  const onBack = vi.fn();
  const onConfirm = vi.fn();
  const subtotal = cart.reduce((acc, i) => acc + (i.price + (i.borderPrice || 0)) * i.quantity, 0);
  render(<StepConfirm cart={cart} entrega={entrega} pagamento={pagamento} subtotal={subtotal} onBack={onBack} onConfirm={onConfirm} enviando={enviando} />);
  return { onBack, onConfirm, subtotal };
}

describe('StepConfirm — resumo final antes de enviar o pedido', () => {
  it('lista os itens do carrinho com o subtotal de cada um (preço-base + borda × quantidade)', () => {
    setup({ cart: [pizzaComBorda] });
    // (52.90 + 8) * 2 = 121.80 — aparece tanto na linha do item quanto no
    // "Subtotal" geral (só 1 item no carrinho, os dois batem); mira a linha do item.
    expect(screen.getByText('2x Pizza Quatro Queijos')).toBeInTheDocument();
    expect(screen.getByText('R$ 121,80', { selector: '.resumo-item span' })).toBeInTheDocument();
  });

  it('entrega: total = subtotal + frete, e mostra o endereço completo', () => {
    setup({ cart: [pizzaMargherita], entrega: enderecoEntrega }); // subtotal 37.99 + frete 8 = 45.99
    expect(screen.getByText('R$ 45,99')).toBeInTheDocument();
    expect(screen.getByText(/av fernando mendes de almeida, 1061 - casa 2 — parque taipas/i)).toBeInTheDocument();
  });

  it('retirada no local: total = só o subtotal (sem frete), independente da taxaEntrega salva', () => {
    setup({ cart: [pizzaMargherita], entrega: retiradaLocal }); // subtotal 37.99, frete ignorado por ser retirada
    // "R$ 37,99" aparece 3x na tela (item, subtotal, total, já que são todos iguais
    // aqui) — a asserção precisa mirar especificamente a linha .resumo-total.
    expect(screen.getByText('R$ 37,99', { selector: '.resumo-total span' })).toBeInTheDocument();
    expect(screen.getByText('Retirada no local')).toBeInTheDocument();
  });

  it('frete grátis (taxaEntrega 0) mostra "Grátis" em vez de R$ 0,00', () => {
    setup({ entrega: { ...enderecoEntrega, taxaEntrega: 0 } });
    expect(screen.getByText('Grátis')).toBeInTheDocument();
  });

  it('mostra a forma de pagamento e, quando houver, o troco e a observação', () => {
    setup({ pagamento: { forma: 'dinheiro', troco: '50,00', obs: 'Tocar interfone 201' } });
    expect(screen.getByText(/dinheiro na entrega/i)).toBeInTheDocument();
    expect(screen.getByText(/troco para 50,00/i)).toBeInTheDocument();
    expect(screen.getByText('Tocar interfone 201')).toBeInTheDocument();
  });

  it('clicar em "Confirmar e enviar" dispara onConfirm', async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup();

    await user.click(screen.getByRole('button', { name: /confirmar e enviar/i }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('enquanto enviando=true, os botões ficam desabilitados (evita duplo envio do mesmo pedido)', () => {
    setup({ enviando: true });

    expect(screen.getByRole('button', { name: /enviando pedido/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeDisabled();
  });
});
