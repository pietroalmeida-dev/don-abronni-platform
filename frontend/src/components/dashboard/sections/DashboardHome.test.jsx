import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardHome from './DashboardHome';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { ordersService } from '../../../services/ordersService';

vi.mock('../../../services/ordersService', () => ({
  ordersService: { getAll: vi.fn() },
}));
vi.mock('../../../hooks/useChart', () => ({ useChart: () => ({ current: null }) }));

const pedido1 = {
  id: 'DA-20260810-001', clienteNome: 'Ana Souza', total: 75.98, status: 'entregue',
  criadoEm: '2026-08-10T18:00:00.000Z', itens: [{ nome: 'Margherita', quantidade: 2 }],
};
const pedido2 = {
  id: 'DA-20260809-002', clienteNome: 'Bruno Lima', total: 42.9, status: 'recebido',
  criadoEm: '2026-08-09T12:00:00.000Z', itens: [{ nome: 'Calabresa', quantidade: 1 }],
};

const stockData = [{ id: 's1', name: 'Farinha', quantity: 2, minStock: 5 }, { id: 's2', name: 'Mussarela', quantity: 20, minStock: 5 }];
const employeesData = [{ id: 'e1', name: 'João' }, { id: 'e2', name: 'Marina' }];

function renderHome(onViewAllOrders = vi.fn()) {
  render(
    <ToastProvider>
      <Toast />
      <DashboardHome stockData={stockData} employeesData={employeesData} onViewAllOrders={onViewAllOrders} />
    </ToastProvider>
  );
  return { onViewAllOrders };
}

describe('DashboardHome (painel admin — visão geral)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordersService.getAll.mockResolvedValue([pedido1, pedido2]);
  });

  it('mostra o spinner e depois os cartões de resumo com os números certos', async () => {
    renderHome();

    expect(screen.getByRole('status')).toBeInTheDocument();
    await screen.findByText('Pedidos totais');
    expect(screen.getByText('Pedidos totais').closest('.stat-card')).toHaveTextContent('2');
    expect(screen.getByText('Receita total').closest('.stat-card')).toHaveTextContent('R$'); // 75.98 + 42.90
    expect(screen.getByText('Estoque crítico').closest('.stat-card')).toHaveTextContent('1'); // só a Farinha está baixa
    expect(screen.getByText('Funcionários').closest('.stat-card')).toHaveTextContent('2');
  });

  it('lista os pedidos mais recentes primeiro, com o status certo', async () => {
    renderHome();
    await screen.findByText('Últimos Pedidos');

    const linhas = screen.getAllByRole('row').slice(1); // pula o cabeçalho
    expect(within(linhas[0]).getByText('DA-20260810-001')).toBeInTheDocument(); // mais recente primeiro
    expect(within(linhas[0]).getByText('Entregue')).toBeInTheDocument();
    expect(within(linhas[1]).getByText('DA-20260809-002')).toBeInTheDocument();
  });

  it('"Ver todos" chama onViewAllOrders', async () => {
    const user = userEvent.setup();
    const { onViewAllOrders } = renderHome();
    await screen.findByText('Últimos Pedidos');

    await user.click(screen.getByRole('button', { name: /ver todos/i }));

    expect(onViewAllOrders).toHaveBeenCalledOnce();
  });

  it('erro ao carregar pedidos: mostra o erro e não trava em loading pra sempre', async () => {
    ordersService.getAll.mockRejectedValue(new Error('Falha ao carregar pedidos.'));
    renderHome();

    expect(await screen.findByText('Falha ao carregar pedidos.')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum pedido recebido ainda.')).toBeInTheDocument();
  });
});
