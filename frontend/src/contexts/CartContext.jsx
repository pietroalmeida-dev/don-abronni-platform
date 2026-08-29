import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartService } from '../services/cartService';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function getItemUnitPrice(item) {
  return item.price + (item.borderPrice || 0);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => cartService.load());
  const showToast = useToast();

  // Persiste a cada mudança — mesma responsabilidade que a antiga saveCart(),
  // agora automática via efeito em vez de chamada manual espalhada pelo código.
  useEffect(() => {
    cartService.save(cart);
  }, [cart]);

  const addToCart = useCallback((product) => {
    const border = product.border || null;
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === product.id && (i.border || null) === border);
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = { ...copy[existingIndex], quantity: copy[existingIndex].quantity + 1 };
        return copy;
      }
      return [...prev, { ...product, border, borderPrice: product.borderPrice || 0, quantity: 1 }];
    });
    showToast(`🍕 ${product.name} adicionado!`);
  }, [showToast]);

  const changeQuantity = useCallback((index, delta) => {
    setCart((prev) => {
      const copy = [...prev];
      const novaQtd = copy[index].quantity + delta;
      if (novaQtd <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = { ...copy[index], quantity: novaQtd };
      }
      return copy;
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const totals = useMemo(() => {
    const totalItems = cart.reduce((a, b) => a + b.quantity, 0);
    const totalPrice = cart.reduce((a, b) => a + getItemUnitPrice(b) * b.quantity, 0);
    return { totalItems, totalPrice };
  }, [cart]);

  // useMemo: sem isso, todo componente que consome useCart() (Navbar, CartDrawer,
  // MenuSection...) re-renderizaria a cada render do CartProvider, mesmo sem
  // nenhum dado que ele usa ter mudado de fato.
  const value = useMemo(
    () => ({ cart, addToCart, changeQuantity, clearCart, ...totals }),
    [cart, addToCart, changeQuantity, clearCart, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa ser usado dentro de um CartProvider');
  return ctx;
}
