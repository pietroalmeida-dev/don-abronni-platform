import { useState } from 'react';
import { obterOpcaoBorda } from '../../data/borderOptions';
import { formatCurrency } from '../../utils/format';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import BorderOptions from './BorderOptions';

// Recebe `key={produto?.id}` de quem o renderiza (ver MenuSection), então cada pizza
// diferente monta uma instância nova deste componente — dispensa um efeito para
// "resetar" sabor1/sabor2/borda quando o produto muda, que é o padrão recomendado
// pelo React para estado derivado de props (em vez de sincronizar via useEffect).
//
// `sabores`: produtos reais vindos da API (mesmo catálogo que o MenuSection já
// carregou), já filtrados pelos que aceitam meia a meia — não existe mais nenhuma
// lista de sabores separada/hardcoded aqui dentro.
function TwoFlavorsModalContent({ produto, sabores, onClose }) {
  const outroSabor = sabores.find((s) => s.id !== produto.id) || produto;
  const [sabor1Id, setSabor1Id] = useState(produto.id);
  const [sabor2Id, setSabor2Id] = useState(outroSabor.id);
  const [bordaId, setBordaId] = useState('none');
  const { addToCart } = useCart();
  const showToast = useToast();

  useLockBodyScroll(true);
  useEscapeKey(onClose, true);

  const sabor1 = sabores.find((s) => s.id === sabor1Id);
  const sabor2 = sabores.find((s) => s.id === sabor2Id);

  // Regra de negócio: a pizza meia a meia é cobrada pelo preço do sabor mais caro
  // entre os dois escolhidos (padrão comum em pizzarias reais). O servidor recalcula
  // isso de novo a partir do catálogo ao criar o pedido — este valor aqui é só pra
  // exibição instantânea antes de confirmar.
  const precoBase = sabor1 && sabor2 ? Math.max(sabor1.precoBase, sabor2.precoBase) : 0;
  const opcao = obterOpcaoBorda(bordaId);
  const total = precoBase + opcao.price;

  function handleConfirm() {
    if (!sabor1 || !sabor2) { showToast('Selecione os dois sabores.', 'erro'); return; }
    if (sabor1.id === sabor2.id) { showToast('Escolha sabores diferentes!', 'erro'); return; }

    // Chave do carrinho ordenada (não pela ordem de seleção): pedir a mesma
    // combinação de novo — mesmo que tenha escolhido os sabores em ordem invertida
    // da vez anterior — soma quantidade na mesma linha, em vez de duplicar o item.
    const [idMenor, idMaior] = [sabor1.id, sabor2.id].sort();

    addToCart({
      id: `${idMenor}_${idMaior}`,
      produtoId: sabor1.id, // id real do 1º sabor — vai pro backend recalcular o preço
      produtoSabor2Id: sabor2.id, // id real do 2º sabor — sem isso o backend rejeita o pedido
      name: `Meia & Meia: ${sabor1.nome} + ${sabor2.nome}`,
      price: precoBase,
      img: sabor1.imagem,
      isHalfHalf: true,
      border: opcao.id === 'none' ? null : opcao.id,
      borderPrice: opcao.price,
    });
    onClose();
  }

  return (
    <div className="two-flavors-modal active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="two-flavors-modal-content">
        <div className="two-flavors-modal-header">
          <h3><i className="fa-solid fa-pizza-slice" /> Monte sua pizza meia &amp; meia</h3>
          <button className="close-two-flavors-modal" onClick={onClose} aria-label="Fechar">&times;</button>
        </div>
        <div className="two-flavors-modal-body">
          <div className="flavor-select-group">
            <label>Primeiro sabor:</label>
            <select className="flavor-select" value={sabor1Id} onChange={(e) => setSabor1Id(e.target.value)}>
              {sabores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="flavor-select-group">
            <label>Segundo sabor:</label>
            <select className="flavor-select" value={sabor2Id} onChange={(e) => setSabor2Id(e.target.value)}>
              {sabores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="border-select-group">
            <label>Borda recheada (opcional):</label>
            <BorderOptions groupName="twoFlavorsBorder" selectedId={bordaId} onChange={setBordaId} />
          </div>
          <div className="price-info">
            <span>Total: <strong>{formatCurrency(total)}</strong></span>
            <span className="info-badge">
              {opcao.id === 'none' ? 'Metade de cada sabor' : `Metade de cada sabor • Borda: ${opcao.label}`}
            </span>
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

export default function TwoFlavorsModal({ produto, sabores, onClose }) {
  if (!produto) return null;
  // A key força uma nova instância (e, portanto, um novo estado inicial) sempre que
  // o cliente abre o modal para uma pizza diferente.
  return <TwoFlavorsModalContent key={produto.id} produto={produto} sabores={sabores} onClose={onClose} />;
}
