import { formatCurrency } from '../../utils/format';
import { resolverUrlImagem } from '../../utils/media';

export default function ProductCard({ produto, onAdd, onTwoFlavors }) {
  return (
    <div className="pizza-card">
      <img src={resolverUrlImagem(produto.imagem)} alt={produto.nome} loading="lazy" />
      <h3>{produto.nome}</h3>
      <p className="pizza-desc">{produto.descricao}</p>
      <div className="pizza-price">{formatCurrency(produto.precoBase)}</div>
      <div className="pizza-actions">
        <button className="btn add-to-cart-btn" onClick={() => onAdd(produto)}>
          <i className="fa-solid fa-cart-plus" /> Adicionar
        </button>
        {produto.permiteDoisSabores && (
          <button className="btn two-flavors-btn" onClick={() => onTwoFlavors(produto)}>
            <i className="fa-solid fa-pizza-slice" /> Dois sabores
          </button>
        )}
      </div>
    </div>
  );
}
