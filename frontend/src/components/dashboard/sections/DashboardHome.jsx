import { useEffect, useState } from 'react';
import { ordersService } from '../../../services/ordersService';
import { CONFIG } from '../../../config';
import { formatCurrency } from '../../../utils/format';
import { useChart } from '../../../hooks/useChart';
import { useToast } from '../../../contexts/ToastContext';
import LoadingSpinner from '../../common/LoadingSpinner';

export default function DashboardHome({ stockData, employeesData, onViewAllOrders }) {
  const [pedidos, setPedidos] = useState(null);
  const showToast = useToast();

  useEffect(() => {
    ordersService.getAll().then(setPedidos).catch((erro) => {
      showToast(erro.message, 'erro');
      setPedidos([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const vendasSemana = [0, 0, 0, 0, 0, 0, 0];
  (pedidos || []).forEach((p) => { vendasSemana[new Date(p.criadoEm).getDay()]++; });

  const contagemItens = {};
  (pedidos || []).forEach((p) => p.itens.forEach((i) => { contagemItens[i.nome] = (contagemItens[i.nome] || 0) + i.quantidade; }));
  const topItens = Object.entries(contagemItens).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const salesChartRef = useChart(pedidos && {
    type: 'bar',
    data: { labels: dias, datasets: [{ label: 'Pedidos', data: vendasSemana, backgroundColor: '#1f4090' }] },
  });

  const topProductsChartRef = useChart(pedidos && {
    type: 'pie',
    data: {
      labels: topItens.length ? topItens.map((i) => i[0]) : ['Sem pedidos ainda'],
      datasets: [{ data: topItens.length ? topItens.map((i) => i[1]) : [1], backgroundColor: ['#0f2b5e', '#2c4c8c', '#4e73b0', '#6c8ac2', '#a3bce0'] }],
    },
  });

  if (!pedidos) return <LoadingSpinner label="Carregando painel..." />;

  const revenue = pedidos.reduce((acc, o) => acc + o.total, 0);
  const lowStock = stockData.filter((s) => s.quantity <= s.minStock).length;
  const recentes = [...pedidos].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 5);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card"><div><h4>Pedidos totais</h4><div className="stat-number">{pedidos.length}</div></div><i className="fa-solid fa-receipt stat-icon" /></div>
        <div className="stat-card"><div><h4>Receita total</h4><div className="stat-number">{formatCurrency(revenue)}</div></div><i className="fa-solid fa-dollar-sign stat-icon" /></div>
        <div className="stat-card"><div><h4>Estoque crítico</h4><div className="stat-number">{lowStock}</div></div><i className="fa-solid fa-box-open stat-icon" /></div>
        <div className="stat-card"><div><h4>Funcionários</h4><div className="stat-number">{employeesData.length}</div></div><i className="fa-solid fa-user-tie stat-icon" /></div>
      </div>
      <div className="charts-row">
        <div className="chart-card"><canvas ref={salesChartRef} /></div>
        <div className="chart-card"><canvas ref={topProductsChartRef} /></div>
      </div>
      <div className="section-title">
        <h3>Últimos Pedidos</h3>
        <button className="btn-primary-dash" onClick={onViewAllOrders}><i className="fa-solid fa-eye" /> Ver todos</button>
      </div>
      <div className="data-table">
        {recentes.length === 0 ? (
          <div className="empty-orders"><i className="fa-regular fa-folder-open" /> Nenhum pedido recebido ainda.</div>
        ) : (
          <table>
            <thead><tr><th>Nota</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {recentes.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td><td>{o.clienteNome}</td><td>{formatCurrency(o.total)}</td>
                  <td>{CONFIG.STATUS_PEDIDO_LABEL[o.status] || o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
