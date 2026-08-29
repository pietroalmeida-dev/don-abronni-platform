import { useEffect, useState } from 'react';
import { usersService } from '../../../services/usersService';
import { ordersService } from '../../../services/ordersService';
import { formatCurrency, formatarDataHora } from '../../../utils/format';
import { useChart } from '../../../hooks/useChart';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../common/LoadingSpinner';

export default function CustomersSection() {
  const [clientes, setClientes] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('name');
  const showToast = useToast();

  useEffect(() => {
    usersService.getComEstatisticas().then(setClientes).catch((erro) => {
      showToast(erro.message, 'erro');
      setClientes([]);
    });
    ordersService.getAll().then(setPedidos).catch((erro) => showToast(erro.message, 'erro'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topSpendersChartRef = useChart(clientes && {
    type: 'bar',
    data: {
      labels: [...clientes].sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 5).map((c) => c.name.split(' ')[0]),
      datasets: [{ label: 'Total gasto (R$)', data: [...clientes].sort((a, b) => b.totalGasto - a.totalGasto).slice(0, 5).map((c) => c.totalGasto), backgroundColor: '#1f4090', borderRadius: 8 }],
    },
    options: { responsive: true, maintainAspectRatio: true },
  });

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyData = new Array(12).fill(0);
  pedidos.forEach((p) => { monthlyData[new Date(p.criadoEm).getMonth()]++; });

  const monthlyChartRef = useChart({
    type: 'line',
    data: { labels: monthNames, datasets: [{ label: 'Pedidos', data: monthlyData, borderColor: '#0f2b5e', backgroundColor: 'rgba(15,43,94,0.1)', fill: true, tension: 0.3 }] },
    options: { responsive: true },
  });

  if (!clientes) return <LoadingSpinner label="Carregando clientes..." />;

  const totalOrdersSum = clientes.reduce((acc, c) => acc + c.totalPedidos, 0);
  const totalSpent = clientes.reduce((acc, c) => acc + c.totalGasto, 0);
  const avgOrders = clientes.length > 0 ? (totalOrdersSum / clientes.length).toFixed(1) : 0;

  let filtrados = [...clientes];
  if (busca.trim()) {
    const t = busca.toLowerCase();
    filtrados = filtrados.filter((c) => c.name.toLowerCase().includes(t) || c.email.toLowerCase().includes(t));
  }
  filtrados.sort((a, b) => {
    if (ordenacao === 'name') return a.name.localeCompare(b.name);
    if (ordenacao === 'orders') return b.totalPedidos - a.totalPedidos;
    return b.totalGasto - a.totalGasto;
  });

  return (
    <>
      <div className="customers-header-stats">
        <div className="customer-stat-card"><div className="customer-stat-icon"><i className="fa-solid fa-users" /></div><div><h4>Total de Clientes</h4><div className="customer-stat-number">{clientes.length}</div></div></div>
        <div className="customer-stat-card"><div className="customer-stat-icon"><i className="fa-solid fa-receipt" /></div><div><h4>Total de Pedidos</h4><div className="customer-stat-number">{totalOrdersSum}</div></div></div>
        <div className="customer-stat-card"><div className="customer-stat-icon"><i className="fa-solid fa-chart-line" /></div><div><h4>Média por Cliente</h4><div className="customer-stat-number">{avgOrders}</div></div></div>
        <div className="customer-stat-card"><div className="customer-stat-icon"><i className="fa-solid fa-dollar-sign" /></div><div><h4>Faturamento Total</h4><div className="customer-stat-number">{formatCurrency(totalSpent)}</div></div></div>
      </div>

      <div className="charts-customers">
        <div className="chart-card"><canvas ref={topSpendersChartRef} /></div>
        <div className="chart-card"><canvas ref={monthlyChartRef} /></div>
      </div>

      <div className="customers-controls">
        <div className="customers-search"><input type="text" placeholder="🔍 Buscar por nome ou e-mail..." value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="customers-sort">
          <button className={`sort-btn ${ordenacao === 'name' ? 'active' : ''}`} onClick={() => setOrdenacao('name')}><i className="fa-solid fa-arrow-down-a-z" /> Nome</button>
          <button className={`sort-btn ${ordenacao === 'orders' ? 'active' : ''}`} onClick={() => setOrdenacao('orders')}><i className="fa-solid fa-chart-simple" /> Pedidos</button>
          <button className={`sort-btn ${ordenacao === 'spent' ? 'active' : ''}`} onClick={() => setOrdenacao('spent')}><i className="fa-solid fa-dollar-sign" /> Gastos</button>
        </div>
      </div>

      <div className="customers-grid">
        {filtrados.length === 0 ? (
          <div className="empty-customers"><i className="fa-regular fa-folder-open" /> Nenhum cliente cadastrado ainda.</div>
        ) : (
          filtrados.map((c) => (
            <div className="customer-card" key={c.id}>
              <div className="customer-header">
                <div className="customer-avatar"><i className="fa-regular fa-user" /></div>
                <div className="customer-info"><h3>{c.name}</h3><div className="customer-email"><i className="fa-regular fa-envelope" /> {c.email}</div></div>
              </div>
              <div className="customer-details">
                <div><i className="fa-regular fa-calendar" /> Última compra: {c.ultimaCompra ? formatarDataHora(c.ultimaCompra) : 'Nunca comprou'}</div>
                <div className="customer-orders"><i className="fa-solid fa-receipt" /> {c.totalPedidos} pedidos • {formatCurrency(c.totalGasto)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
