import { useEffect, useState } from 'react';
import { ordersService } from '../../../services/ordersService';
import { CONFIG } from '../../../config';
import { formatCurrency, gerarNumeroNota } from '../../../utils/format';
import { useToast } from '../../../contexts/ToastContext';
import DashboardModal from '../DashboardModal';
import LoadingSpinner from '../../common/LoadingSpinner';

const ICONE_STATUS = { todos: 'fa-list', recebido: 'fa-inbox', preparando: 'fa-clock', saiu_entrega: 'fa-truck-fast', entregue: 'fa-check-circle' };
const CLASSE_STATUS = { recebido: 'preparando', preparando: 'preparando', saiu_entrega: 'saiu', entregue: 'entregue', cancelado: 'entregue' };

export default function OrdersSection({ onOrdersChanged }) {
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [pedidoEditando, setPedidoEditando] = useState(null);
  const [novoStatusForm, setNovoStatusForm] = useState('');
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  const [novoPedidoForm, setNovoPedidoForm] = useState({ cliente: '', itens: '', total: '' });
  const showToast = useToast();

  async function carregar() {
    setPedidos(await ordersService.getAll());
  }

  // Busca os pedidos ao montar a seção. É uma chamada única de carregamento de
  // dados (não sincroniza estado derivado de props) — um padrão aceito mesmo pela
  // documentação do React quando não se usa uma lib dedicada de data-fetching, que
  // não foi pedida para este projeto.
  useEffect(() => { carregar(); }, []);

  if (!pedidos) return <LoadingSpinner label="Carregando pedidos..." />;

  const statusCounts = {
    todos: pedidos.length,
    [CONFIG.STATUS_PEDIDO.RECEBIDO]: pedidos.filter((o) => o.status === CONFIG.STATUS_PEDIDO.RECEBIDO).length,
    [CONFIG.STATUS_PEDIDO.PREPARANDO]: pedidos.filter((o) => o.status === CONFIG.STATUS_PEDIDO.PREPARANDO).length,
    [CONFIG.STATUS_PEDIDO.SAIU_ENTREGA]: pedidos.filter((o) => o.status === CONFIG.STATUS_PEDIDO.SAIU_ENTREGA).length,
    [CONFIG.STATUS_PEDIDO.ENTREGUE]: pedidos.filter((o) => o.status === CONFIG.STATUS_PEDIDO.ENTREGUE).length,
  };

  let filtrados = [...pedidos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  if (filtro !== 'todos') filtrados = filtrados.filter((o) => o.status === filtro);
  if (busca.trim()) {
    const t = busca.toLowerCase();
    filtrados = filtrados.filter((o) => o.clienteNome.toLowerCase().includes(t) || o.id.toLowerCase().includes(t));
  }

  async function salvarNovoStatus() {
    // ordersService.updateStatus nunca lança exceção — devolve { ok, erro } mesmo
    // quando falha (rede, permissão, status inválido). Sem checar `ok` aqui, uma
    // falha real (ex.: sessão de admin expirada) fechava o modal e mostrava
    // "atualizado" mesmo sem o status ter mudado no banco — um falso positivo que
    // deixava o painel mostrando um status desatualizado sem o admin perceber.
    const resultado = await ordersService.updateStatus(pedidoEditando.id, novoStatusForm);
    if (!resultado.ok) {
      showToast(resultado.erro || 'Não foi possível atualizar o status. Tente novamente.', 'erro');
      return;
    }
    setPedidoEditando(null);
    await carregar();
    onOrdersChanged();
    showToast(`Status do pedido ${pedidoEditando.id} atualizado.`);
  }

  async function salvarNovoPedido() {
    const { cliente, itens, total } = novoPedidoForm;
    const totalNum = parseFloat(total);
    if (!cliente || !itens || Number.isNaN(totalNum)) { showToast('Preencha todos os campos.', 'erro'); return; }

    const itensArr = itens.split(',').map((nome) => ({
      produtoId: null, nome: nome.trim(), tipo: 'unica', borda: null, precoBorda: 0, precoUnitario: null, quantidade: 1, subtotal: null,
    }));

    // Diferente de create/updateStatus, createManualAdmin não captura erro
    // internamente — deixa a exceção subir. Sem o try/catch aqui, uma falha (rede,
    // sessão de admin expirada) não mostrava nada: o admin ficava olhando o modal
    // aberto sem saber se o pedido foi lançado ou não.
    try {
      await ordersService.createManualAdmin({
        id: gerarNumeroNota(),
        usuarioId: null,
        clienteNome: cliente,
        clienteEmail: null,
        itens: itensArr,
        entrega: { tipo: 'retirada', endereco: null, taxaEntrega: 0 },
        pagamento: { forma: 'dinheiro', trocoPara: '', statusPagamento: 'pendente' },
        observacao: 'Pedido lançado manualmente pelo painel administrativo.',
        subtotal: totalNum,
        total: totalNum,
        status: CONFIG.STATUS_PEDIDO.RECEBIDO,
      });
    } catch (erro) {
      showToast(erro.message || 'Não foi possível adicionar o pedido. Tente novamente.', 'erro');
      return;
    }

    setShowNovoPedido(false);
    setNovoPedidoForm({ cliente: '', itens: '', total: '' });
    await carregar();
    onOrdersChanged();
    showToast('Pedido adicionado.');
  }

  return (
    <>
      <div className="orders-header-stats">
        {Object.entries(statusCounts).map(([s, c]) => (
          <div key={s} className={`order-status-card ${filtro === s ? 'active' : ''}`} onClick={() => setFiltro(s)}>
            <div className="status-icon"><i className={`fa-solid ${ICONE_STATUS[s]}`} /></div>
            <div className="status-info">
              <h4>{s === 'todos' ? 'Todos' : CONFIG.STATUS_PEDIDO_LABEL[s]}</h4>
              <div className="status-count">{c}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="search-filter-bar">
        <input type="text" placeholder="🔍 Buscar por cliente ou nota..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="btn-primary-dash" style={{ background: 'var(--primary)' }} onClick={() => setShowNovoPedido(true)}>
          <i className="fa-solid fa-plus" /> Novo Pedido
        </button>
      </div>

      <div className="orders-grid">
        {filtrados.length === 0 ? (
          <div className="empty-orders"><i className="fa-regular fa-folder-open" /> Nenhum pedido encontrado.</div>
        ) : (
          filtrados.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="order-card-header">
                <span className="order-id">{o.id}</span>
                <span className={`order-status-badge status-${CLASSE_STATUS[o.status] || 'preparando'}`}>{CONFIG.STATUS_PEDIDO_LABEL[o.status] || o.status}</span>
              </div>
              <div className="order-customer"><i className="fa-regular fa-user" /> {o.clienteNome}</div>
              <div className="order-items"><i className="fa-regular fa-rectangle-list" /> {o.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', ')}</div>
              <div className="order-footer">
                <span className="order-total">{formatCurrency(o.total)}</span>
                <button className="update-status-btn" onClick={() => { setPedidoEditando(o); setNovoStatusForm(o.status); }}>
                  <i className="fa-solid fa-pen" /> Atualizar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <DashboardModal open={!!pedidoEditando} title="Atualizar status do pedido" icon="fa-pen" onClose={() => setPedidoEditando(null)}>
        {pedidoEditando && (
          <>
            <div className="form-group"><label>Nota: <strong>{pedidoEditando.id}</strong></label></div>
            <div className="form-group">
              <label htmlFor="novoStatusPedido">Novo status</label>
              <select id="novoStatusPedido" value={novoStatusForm} onChange={(e) => setNovoStatusForm(e.target.value)}>
                {Object.entries(CONFIG.STATUS_PEDIDO_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>{label}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary-dash" style={{ width: '100%' }} onClick={salvarNovoStatus}>Salvar</button>
          </>
        )}
      </DashboardModal>

      <DashboardModal open={showNovoPedido} title="Criar novo pedido (telefone/balcão)" icon="fa-pizza-slice" onClose={() => setShowNovoPedido(false)}>
        <div className="form-group"><label htmlFor="novoPedidoCliente">Cliente</label><input id="novoPedidoCliente" value={novoPedidoForm.cliente} onChange={(e) => setNovoPedidoForm({ ...novoPedidoForm, cliente: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoPedidoItens">Itens</label><input id="novoPedidoItens" placeholder="ex: Margherita, Pepperoni" value={novoPedidoForm.itens} onChange={(e) => setNovoPedidoForm({ ...novoPedidoForm, itens: e.target.value })} /></div>
        <div className="form-group"><label htmlFor="novoPedidoTotal">Total</label><input id="novoPedidoTotal" type="number" step="0.01" value={novoPedidoForm.total} onChange={(e) => setNovoPedidoForm({ ...novoPedidoForm, total: e.target.value })} /></div>
        <button className="btn-primary-dash" style={{ width: '100%' }} onClick={salvarNovoPedido}>Adicionar</button>
      </DashboardModal>
    </>
  );
}
