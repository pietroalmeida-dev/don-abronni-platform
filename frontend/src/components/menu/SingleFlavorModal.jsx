import { useState } from 'react';
import { obterOpcaoBorda } from '../../data/borderOptions';
import { formatCurrency } from '../../utils/format';
import { useCart } from '../../contexts/CartContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import BorderOptions from './BorderOptions';

export default function SingleFlavorModal({ produto, onClose }) {
  const [bordaId, setBordaId] = useState('none');
  const { addToCart } = useCart();

  useLockBodyScroll(!!produto);
  useEscapeKey(onClose, !!produto);

  if (!produto) return null;

  const opcao = obterOpcaoBorda(bordaId);
  const total = produto.precoBase + opcao.price;

  function handleConfirm() {
    addToCart({
      id: produto.id,
      name: produto.nome,
      price: produto.precoBase,
      img: produto.imagem,
      border: opcao.id === 'none' ? null : opcao.id,
      borderPrice: opcao.price,
    });
    onClose();
  }

  return (
    <div className="two-flavors-modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="two-flavors-modal-content">
        <div className="two-flavors-modal-header">
          <h3><i className="fa-solid fa-pizza-slice" /> Monte sua pizza</h3>
          <button className="close-two-flavors-modal" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="two-flavors-modal-body">
          <div className="selected-pizza-info">
            <i className="fa-solid fa-pizza-slice" /> <strong>{produto.nome}</strong>
          </div>
          <div className="border-select-group">
            <label>Borda recheada (opcional):</label>
            <BorderOptions groupName="singleFlavorBorder" selectedId={bordaId} onChange={setBordaId} />
          </div>
          <div className="price-info">
            <span>Total: <strong>{formatCurrency(total)}</strong></span>
            <span className="info-badge">{opcao.id === 'none' ? 'Sem borda recheada' : `Borda: ${opcao.label}`}</span>
          </div>
        </div>
        <div className="two-flavors-modal-footer">
          <button className="btn cancel-two-flavors" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary confirm-two-flavors" onClick={handleConfirm}>Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  );
}
