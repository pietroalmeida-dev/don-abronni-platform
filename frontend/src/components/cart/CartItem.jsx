import { formatCurrency } from '../../utils/format';
import { getItemUnitPrice } from '../../contexts/CartContext';
import { resolverUrlImagem } from '../../utils/media';

export default function CartItem({ item, index, onChangeQuantity }) {
  const unitPrice = getItemUnitPrice(item);
  const borderLabel = item.border ? `Borda: ${item.border}` : 'Sem borda recheada';

  return (
    <div className="item">
      <div className="item-image">
        <img
          src={resolverUrlImagem(item.img)}
          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 12 }}
          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=50&h=50&fit=crop'; }}
          alt={item.name}
        />
      </div>
      <div className="item-info">
        <strong>{item.name}</strong>
        <span>{formatCurrency(unitPrice)}</span>
        <span>{borderLabel}</span>
      </div>
      <div className="item-qty">
        <span className="quantity-btn" onClick={() => onChangeQuantity(index, -1)}>−</span>
        <span className="qty-value">{item.quantity}</span>
        <span className="quantity-btn" onClick={() => onChangeQuantity(index, 1)}>+</span>
      </div>
      <div className="item-subtotal">{formatCurrency(unitPrice * item.quantity)}</div>
    </div>
  );
}
