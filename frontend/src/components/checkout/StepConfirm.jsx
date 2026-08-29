import { formatCurrency } from '../../utils/format';
import { getItemUnitPrice } from '../../contexts/CartContext';

const PAG_LABEL = { pix: '🟢 Pix', cartao: '💳 Cartão na entrega', dinheiro: '💵 Dinheiro na entrega' };

export default function StepConfirm({ cart, entrega, pagamento, subtotal, onBack, onConfirm, enviando }) {
  const total = subtotal + (entrega.tipo === 'delivery' ? entrega.taxaEntrega : 0);

  const endStr = entrega.tipo === 'delivery'
    ? `${entrega.endereco.rua}, ${entrega.endereco.numero}${entrega.endereco.complemento ? ` - ${entrega.endereco.complemento}` : ''} — ${entrega.endereco.bairro}`
    : 'Retirada no local';

  return (
    <div className="checkout-body">
      <div className="checkout-section-title">Resumo do pedido</div>
      <div className="checkout-resumo-itens">
        {cart.map((i) => (
          // Mesma key estável usada em CartDrawer — id+borda, não o índice: o
          // carrinho pode perder itens do meio da lista (CartContext.changeQuantity
          // remove com splice), e usar índice como key faz o React reconciliar
          // linhas erradas por um render antes de atualizar.
          <div className="resumo-item" key={`${i.id}-${i.border || 'none'}`}>
            <span>{i.quantity}x {i.name}{i.border && <small style={{ color: 'var(--text-muted)' }}> (Borda: {i.border})</small>}</span>
            <span>{formatCurrency(getItemUnitPrice(i) * i.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="checkout-resumo-totais">
        <div className="resumo-linha"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
        <div className="resumo-linha"><span>Frete</span><span>{entrega.taxaEntrega > 0 ? formatCurrency(entrega.taxaEntrega) : 'Grátis'}</span></div>
        <div className="resumo-linha resumo-total"><span>Total</span><span>{formatCurrency(total)}</span></div>
      </div>
      <div className="checkout-resumo-info">
        <div className="resumo-info-linha"><i className="fa-solid fa-location-dot" /> {endStr}</div>
        <div className="resumo-info-linha"><i className="fa-solid fa-credit-card" /> {PAG_LABEL[pagamento.forma]}</div>
        {pagamento.troco && <div className="resumo-info-linha"><i className="fa-solid fa-coins" /> Troco para {pagamento.troco}</div>}
        {pagamento.obs && <div className="resumo-info-linha"><i className="fa-solid fa-note-sticky" /> {pagamento.obs}</div>}
      </div>
      <div className="checkout-footer">
        <button className="btn btn-outline" onClick={onBack} disabled={enviando}><i className="fa-solid fa-arrow-left" /> Voltar</button>
        <button className="btn btn-primary" onClick={onConfirm} disabled={enviando}>
          {enviando ? <><i className="fa-solid fa-spinner fa-spin" /> Enviando pedido...</> : <><i className="fa-brands fa-whatsapp" /> Confirmar e enviar</>}
        </button>
      </div>
    </div>
  );
}
