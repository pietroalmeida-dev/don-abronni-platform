import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CartDrawer from './CartDrawer';
import { CartProvider, useCart } from '../../contexts/CartContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { UIProvider } from '../../contexts/UIContext';
import { AuthProvider } from '../../contexts/AuthContext';

// Componente auxiliar só para popular o carrinho antes de cada teste, usando o
// hook real (useCart) em vez de escrever direto no localStorage — assim o
// teste também serve como confirmação de que Provider e hook conversam entre si.
function AdicionaAoCarrinho({ itens }) {
  const { addToCart } = useCart();
  return (
    <button data-testid="setup-add-all" onClick={() => itens.forEach((i) => addToCart(i))}>
      setup
    </button>
  );
}

function renderCartDrawer(itensIniciais = []) {
  render(
    <ToastProvider>
      <AuthProvider>
        <UIProvider>
          <CartProvider>
            <AdicionaAoCarrinho itens={itensIniciais} />
            <CartDrawer onOpenCheckout={() => {}} />
          </CartProvider>
        </UIProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

const pizzaMargherita = { id: 'p1', name: 'Pizza Margherita', price: 37.99 };
const pizzaPepperoni = { id: 'p2', name: 'Pizza Pepperoni', price: 42.5 };

describe('CartDrawer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mostra a mensagem de carrinho vazio quando não há itens', () => {
    renderCartDrawer();
    expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
  });

  it('lista os itens adicionados com nome e preço', async () => {
    const user = userEvent.setup();
    renderCartDrawer([pizzaMargherita, pizzaPepperoni]);
    await user.click(screen.getByTestId('setup-add-all'));

    expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
    expect(screen.getByText('Pizza Pepperoni')).toBeInTheDocument();
  });

  it('o total exibido é a soma dos itens, e atualiza ao aumentar a quantidade', async () => {
    const user = userEvent.setup();
    renderCartDrawer([pizzaMargherita]);
    await user.click(screen.getByTestId('setup-add-all'));

    // 1x Pizza Margherita = R$ 37,99. Com só 1 item na quantidade 1, o subtotal
    // da linha e o total geral coincidem — por isso a asserção mira
    // especificamente o .cart-total (rodapé), não qualquer "R$ 37,99" na tela.
    expect(screen.getByText('R$ 37,99', { selector: '.cart-total' })).toBeInTheDocument();

    // Clica no "+" do item para ir a 2x -> R$ 75,98.
    await user.click(screen.getByText('+', { selector: '.quantity-btn' }));

    expect(screen.getByText('R$ 75,98', { selector: '.cart-total' })).toBeInTheDocument();
  });

  it('reduzir a quantidade até 0 remove o item e volta a mostrar "carrinho vazio"', async () => {
    const user = userEvent.setup();
    renderCartDrawer([pizzaMargherita]);
    await user.click(screen.getByTestId('setup-add-all'));

    expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();

    const botaoDiminuir = screen.getByText('−', { selector: '.quantity-btn' });
    await user.click(botaoDiminuir);

    expect(screen.queryByText('Pizza Margherita')).not.toBeInTheDocument();
    expect(screen.getByText('Seu carrinho está vazio')).toBeInTheDocument();
  });
});
