import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart, getItemUnitPrice } from './CartContext';
import { ToastProvider } from './ToastContext';

// Envolve com o ToastProvider real (não mockado): CartContext depende de
// useToast() para avisar "produto adicionado", e é mais simples/realista deixar
// o provider de verdade rodar do que mockar o hook. CartProvider precisa vir
// por dentro do ToastProvider (é ele quem consome useToast()).
function wrapper({ children }) {
  return (
    <ToastProvider>
      <CartProvider>{children}</CartProvider>
    </ToastProvider>
  );
}

function renderCart() {
  return renderHook(() => useCart(), { wrapper });
}

const pizzaMargherita = { id: 'p1', name: 'Pizza Margherita', price: 37.99 };
const pizzaComBorda = { id: 'p2', name: 'Pizza Quatro Queijos', price: 52.9, border: 'Catupiry', borderPrice: 8 };

describe('getItemUnitPrice', () => {
  it('soma o preço da borda ao preço base', () => {
    expect(getItemUnitPrice(pizzaComBorda)).toBe(60.9);
  });

  it('sem borda, o preço unitário é só o preço base', () => {
    expect(getItemUnitPrice(pizzaMargherita)).toBe(37.99);
  });
});

describe('CartContext', () => {
  beforeEach(() => {
    // O carrinho persiste em localStorage entre renders (ver CartContext.jsx) —
    // sem limpar aqui, um teste vazaria itens para o próximo.
    localStorage.clear();
  });

  it('começa vazio quando não há carrinho salvo', () => {
    const { result } = renderCart();
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('adiciona um produto novo com quantidade 1', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0]).toMatchObject({ id: 'p1', quantity: 1 });
    expect(result.current.totalItems).toBe(1);
  });

  it('adicionar o mesmo produto de novo soma a quantidade, não duplica a linha', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    act(() => result.current.addToCart(pizzaMargherita));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it('a mesma pizza com bordas diferentes conta como itens separados no carrinho', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart({ ...pizzaMargherita, border: null }));
    act(() => result.current.addToCart({ ...pizzaMargherita, border: 'Catupiry', borderPrice: 8 }));
    expect(result.current.cart).toHaveLength(2);
  });

  it('totalPrice soma preço-base + borda de cada item, multiplicado pela quantidade', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita)); // 37.99 x1
    act(() => result.current.addToCart(pizzaComBorda)); // 60.90 x1
    act(() => result.current.addToCart(pizzaComBorda)); // vira x2 -> 60.90 x2
    // 37.99 + (60.90 * 2) = 159.79
    expect(result.current.totalPrice).toBeCloseTo(159.79, 2);
  });

  it('changeQuantity(+1) aumenta a quantidade do item', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    act(() => result.current.changeQuantity(0, 1));
    expect(result.current.cart[0].quantity).toBe(2);
  });

  it('changeQuantity(-1) até chegar a 0 remove o item do carrinho', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    act(() => result.current.changeQuantity(0, -1));
    expect(result.current.cart).toHaveLength(0);
  });

  it('clearCart esvazia o carrinho inteiro', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    act(() => result.current.addToCart(pizzaComBorda));
    act(() => result.current.clearCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalPrice).toBe(0);
  });

  it('persiste o carrinho em localStorage a cada mudança', () => {
    const { result } = renderCart();
    act(() => result.current.addToCart(pizzaMargherita));
    const salvo = JSON.parse(localStorage.getItem('donAbronniCart'));
    expect(salvo).toHaveLength(1);
    expect(salvo[0].id).toBe('p1');
  });

  it('carrega o carrinho salvo em localStorage ao montar (sobrevive a um "reload" da página)', () => {
    localStorage.setItem('donAbronniCart', JSON.stringify([{ ...pizzaMargherita, border: null, borderPrice: 0, quantity: 3 }]));
    const { result } = renderCart();
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(3);
  });
});
