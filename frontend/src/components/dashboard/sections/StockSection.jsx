import { useState } from 'react';
import { stockService } from '../../../services/stockService';
import { formatCurrency } from '../../../utils/format';
import { useToast } from '../../../contexts/ToastContext';
import { useChart } from '../../../hooks/useChart';
import DashboardModal from '../DashboardModal';

export default function StockSection({ stockData, setStockData }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [itemAjustando, setItemAjustando] = useState(null);
  const [ajusteValor, setAjusteValor] = useState('0');
  const [showNovoItem, setShowNovoItem] = useState(false);
  const [novoItemForm, setNovoItemForm] = useState({ name: '', category: 'Geral', quantity: '', unit: 'kg', minStock: '' });
  const showToast = useToast();

  const categorias = [...new Set(stockData.map((s) => s.category))];
  const totalValue = stockData.reduce((a, s) => a + s.quantity * 15, 0);
  const lowItems = stockData.filter((s) => s.quantity <= s.minStock);

  const chartRef = useChart({
    type: 'bar',
    data: {
      labels: categorias,
      datasets: [{ label: 'Quantidade total', data: categorias.map((c) => stockData.filter((s) => s.category === c).reduce((a, s) => a + s.quantity, 0)), backgroundColor: '#1f4090', borderRadius: 8 }],
    },
  });

  // stockData vive no componente pai (AdminDashboardPage) e só é buscado uma vez —
  // antes, esta função atualizava o estado local ANTES de confirmar que o backend
  // salvou, sem tratar falha nenhuma. Se stockService.save() falhasse (rede,
  // sessão de admin expirada), o painel ficava mostrando um estoque que nunca foi
  // salvo de verdade, sem nenhum aviso, até a página ser recarregada. Agora só
  // atualiza o estado com a lista que o próprio servidor confirmou ter salvo, e
  // devolve `false` em caso de erro para quem chamou decidir o que fazer (não
  // fechar o modal, não mostrar "sucesso").
  async function persist(novaLista) {
    try {
      setStockData(await stockService.save(novaLista));
      return true;
    } catch (erro) {
      showToast(erro.message || 'Não foi possível salvar. Tente novamente.', 'erro');
      return false;
    }
  }

  let filtrados = [...stockData];
  if (categoriaFiltro !== 'todos') filtrados = filtrados.filter((s) => s.category === categoriaFiltro);
  if (busca.trim()) filtrados = filtrados.filter((s) => s.name.toLowerCase().includes(busca.toLowerCase()));

  async function salvarEdicao() {
    const atualizado = stockData.map((s) => (s.id === itemEditando.id ? itemEditando : s));
    if (!(await persist(atualizado))) return;
    setItemEditando(null);
    showToast('Ingrediente atualizado.');
  }

  async function salvarAjuste() {
    const delta = parseFloat(ajusteValor);
    if (Number.isNaN(delta)) { showToast('Valor inválido.', 'erro'); return; }
    const atualizado = stockData.map((s) => (s.id === itemAjustando.id ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s));
    if (!(await persist(atualizado))) return;
    setItemAjustando(null);
    showToast('Estoque ajustado.');
  }

  async function salvarNovoItem() {
    const { name, category, quantity, unit, minStock } = novoItemForm;
    const quantityNum = parseFloat(quantity);
    const minStockNum = parseFloat(minStock);
    // Único formulário "novo X" do painel que não validava nada antes desta revisão
    // — um envio vazio mandava NaN pro backend e só falhava lá, sem mensagem clara.
    // Regras espelham a validação real do backend (ver estoqueValidations.js).
    if (!name.trim() || !category.trim() || !unit.trim() || Number.isNaN(quantityNum) || quantityNum < 0 || Number.isNaN(minStockNum) || minStockNum < 0) {
      showToast('Preencha todos os campos com valores válidos.', 'erro');
      return;
    }
    const novo = { id: Date.now(), name, category, quantity: quantityNum, unit, minStock: minStockNum };
    if (!(await persist([...stockData, novo]))) return;
    setShowNovoItem(false);
    setNovoItemForm({ name: '', category: 'Geral', quantity: '', unit: 'kg', minStock: '' });
    showToast('Ingrediente adicionado.');
  }

  return (
    <>
      <div className="stock-header-stats">
        <div className="stock-stat-card"><div className="stock-stat-icon"><i className="fa-solid fa-cubes" /></div><div><h4>Total de Itens</h4><div className="stock-stat-number">{stockData.length}</div></div></div>
        <div className="stock-stat-card"><div className="stock-stat-icon"><i className="fa-solid fa-exclamation-triangle" /></div><div><h4>Estoque Baixo</h4><div className="stock-stat-number">{lowItems.length}</div></div></div>
        <div className="stock-stat-card"><div className="stock-stat-icon"><i className="fa-solid fa-coins" /></div><div><h4>Valor Estimado</h4><div className="stock-stat-number">{formatCurrency(totalValue)}</div></div></div>
      </div>

      <div className="chart-and-alerts">
        <div className="stock-chart-card"><canvas ref={chartRef} /></div>
        <div className="stock-alerts-card">
          <h4><i className="fa-solid fa-bell" /> Alertas de estoque</h4>
          {lowItems.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--success)' }}><i className="fa-solid fa-check-circle" /> Todos os itens estão OK!</div>
          ) : (
            lowItems.map((s) => (
              <div className="alert-item" key={s.id}><i className="fa-solid fa-circle-exclamation" /> <strong>{s.name}</strong>: {s.quantity} {s.unit} (mínimo {s.minStock})</div>
            ))
          )}
        </div>
      </div>

      <div className="stock-controls">
        <div className="stock-search"><input type="text" placeholder="🔍 Buscar ingrediente..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="stock-category-filter">
          {['todos', ...categorias].map((c) => (
            <button key={c} className={`cat-btn ${categoriaFiltro === c ? 'active' : ''}`} onClick={() => setCategoriaFiltro(c)}>{c === 'todos' ? 'Todos' : c}</button>
          ))}
        </div>
        <button className="btn-primary-dash" onClick={() => setShowNovoItem(true)}><i className="fa-solid fa-plus" /> Adicionar Item</button>
      </div>

      <div className="stock-items-grid">
        {filtrados.length === 0 ? (
          <div className="empty-stock"><i className="fa-regular fa-folder-open" /> Nenhum ingrediente encontrado.</div>
        ) : (
          filtrados.map((item) => {
            const percent = Math.min(100, (item.quantity / (item.minStock * 2)) * 100);
            const isLow = item.quantity <= item.minStock;
            return (
              <div className="stock-item-card" key={item.id}>
                <div className="stock-item-header"><span className="stock-item-name">{item.name}</span><span className="stock-item-unit">{item.unit}</span></div>
                <div className="stock-item-quantity">{item.quantity} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span></div>
                <div className="stock-progress"><div className={`stock-progress-bar ${isLow ? 'low' : ''}`} style={{ width: `${percent}%` }} /></div>
                <div className="stock-item-min">Mínimo: {item.minStock} {item.unit}</div>
                <div className="stock-item-actions">
                  <button onClick={() => setItemEditando({ ...item })}><i className="fa-solid fa-pen" /> Editar</button>
                  <button onClick={() => { setItemAjustando(item); setAjusteValor('0'); }}><i className="fa-solid fa-plus-minus" /> Ajustar</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <i className="fa-solid fa-circle-info" /> A baixa automática de estoque por pedido depende de uma ficha técnica (pizza → ingredientes) ainda não modelada — ver documentação.
      </p>

      <DashboardModal open={!!itemEditando} title="Editar Ingrediente" icon="fa-edit" onClose={() => setItemEditando(null)}>
        {itemEditando && (
          <>
            <div className="form-group"><label htmlFor="editNome">Nome</label><input id="editNome" value={itemEditando.name} onChange={(e) => setItemEditando({ ...itemEditando, name: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="editCategoria">Categoria</label><input id="editCategoria" value={itemEditando.category} onChange={(e) => setItemEditando({ ...itemEditando, category: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="editQuantidade">Quantidade</label><input id="editQuantidade" type="number" value={itemEditando.quantity} onChange={(e) => setItemEditando({ ...itemEditando, quantity: parseFloat(e.target.value) })} /></div>
            <div className="form-group"><label htmlFor="editUnidade">Unidade</label><input id="editUnidade" value={itemEditando.unit} onChange={(e) => setItemEditando({ ...itemEditando, unit: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="editEstoqueMinimo">Estoque Mínimo</label><input id="editEstoqueMinimo" type="number" value={itemEditando.minStock} onChange={(e) => setItemEditando({ ...itemEditando, minStock: parseFloat(e.target.value) })} /></div>
            <button className="btn-primary-dash" onClick={salvarEdicao}>Salvar</button>
          </>
        )}
      </DashboardModal>

      <DashboardModal open={!!itemAjustando} title="Ajustar Estoque" icon="fa-scale-balanced" onClose={() => setItemAjustando(null)}>
        {itemAjustando && (
          <>
            <div className="form-group"><label>Ingrediente: <strong>{itemAjustando.name}</strong></label></div>
            <div className="form-group"><label>Quantidade atual: {itemAjustando.quantity} {itemAjustando.unit}</label></div>
            <div className="form-group"><label htmlFor="ajusteValor">Adicionar / Remover</label><input id="ajusteValor" type="number" placeholder="Ex: 5 ou -3" value={ajusteValor} onChange={(e) => setAjusteValor(e.target.value)} /></div>
            <button className="btn-primary-dash" onClick={salvarAjuste}>Aplicar</button>
          </>
        )}
      </DashboardModal>

      <DashboardModal open={showNovoItem} title="Novo Ingrediente" icon="fa-plus-circle" onClose={() => setShowNovoItem(false)}>
        <div className="form-group"><label htmlFor="novoItemNome">Nome</label><input id="novoItemNome" value={novoItemForm.name} onChange={(e) => setNovoItemForm({ ...novoItemForm, name: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoItemCategoria">Categoria</label><input id="novoItemCategoria" value={novoItemForm.category} onChange={(e) => setNovoItemForm({ ...novoItemForm, category: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoItemQuantidade">Quantidade</label><input id="novoItemQuantidade" type="number" value={novoItemForm.quantity} onChange={(e) => setNovoItemForm({ ...novoItemForm, quantity: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoItemUnidade">Unidade</label><input id="novoItemUnidade" value={novoItemForm.unit} onChange={(e) => setNovoItemForm({ ...novoItemForm, unit: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoItemEstoqueMinimo">Estoque Mínimo</label><input id="novoItemEstoqueMinimo" type="number" value={novoItemForm.minStock} onChange={(e) => setNovoItemForm({ ...novoItemForm, minStock: e.target.value })} /></div>
        <button className="btn-primary-dash" onClick={salvarNovoItem}>Adicionar</button>
      </DashboardModal>
    </>
  );
}
