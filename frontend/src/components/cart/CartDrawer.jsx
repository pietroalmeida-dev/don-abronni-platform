import { useCart } from '../../contexts/CartContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/format';
import CartItem from './CartItem';

export default function CartDrawer({ onOpenCheckout }) {
  const { cart, changeQuantity, totalPrice } = useCart();
  const { isCartOpen, closeCart, requireLoginUI } = useUI();
  const { session } = useAuth();
  const showToast = useToast();

  function handleCheckout() {
    if (cart.length === 0) { showToast('Carrinho vazio!', 'aviso'); return; }
    if (!requireLoginUI(!!session)) return;
    closeCart();
    onOpenCheckout();
  }

  return (
    <div className={`cart-tab ${isCartOpen ? 'cart-tab-active' : ''}`}>
      <h3>Carrinho</h3>
      <div className="cart-list">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <i className="fa-solid fa-bag-shopping" />
            <p>Seu carrinho está vazio</p>
            <span>Adicione pizzas do cardápio</span>
          </div>
        ) : (
          cart.map((item, idx) => (
            <CartItem key={`${item.id}-${item.border || 'none'}`} item={item} index={idx} onChangeQuantity={changeQuantity} />
          ))
        )}
      </div>
      <div className="total-container">
        <h4>Total:</h4>
        <h4 className="cart-total">{formatCurrency(totalPrice)}</h4>
      </div>
      <div className="flex gap-2">
        <a href="#close" className="btn btn-outline" onClick={(e) => { e.preventDefault(); closeCart(); }}>Fechar</a>
        <a href="#checkout" className="btn" onClick={(e) => { e.preventDefault(); handleCheckout(); }}>Finalizar</a>
      </div>
    </div>
  );
}
