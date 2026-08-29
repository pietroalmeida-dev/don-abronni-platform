import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersSection from './CustomersSection';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { usersService } from '../../../services/usersService';
import { ordersService } from '../../../services/ordersService';

vi.mock('../../../services/usersService', () => ({
  usersService: { getComEstatisticas: vi.fn() },
}));
vi.mock('../../../services/ordersService', () => ({
  ordersService: { getAll: vi.fn() },
}));
vi.mock('../../../hooks/useChart', () => ({ useChart: () => ({ current: null }) }));

const ana = { id: 'u1', name: 'Ana Souza', email: 'ana@teste.com', totalPedidos: 8, totalGasto: 420.5, ultimaCompra: '2026-08-01T12:00:00.000Z' };
const bruno = { id: 'u2', name: 'Bruno Lima', email: 'bruno@teste.com', totalPedidos: 2, totalGasto: 90, ultimaCompra: null };

function renderSection() {
  render(
    <ToastProvider>
      <Toast />
      <CustomersSection />
    </ToastProvider>
  );
}

describe('CustomersSection (painel admin — clientes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersService.getComEstatisticas.mockResolvedValue([ana, bruno]);
    ordersService.getAll.mockResolvedValue([]);
  });

  it('mostra o spinner e depois as estatísticas e a lista de clientes', async () => {
    renderSection();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Total de Clientes').closest('.customer-stat-card')).toHaveTextContent('2');
    expect(screen.getByText('Total de Pedidos').closest('.customer-stat-card')).toHaveTextContent('10'); // 8 + 2
  });

  it('cliente sem compras mostra "Nunca comprou" em vez de tentar formatar uma data nula', async () => {
    renderSection();
    await screen.findByText('Ana Souza');

    expect(screen.getByText('Bruno Lima').closest('.customer-card')).toHaveTextContent('Nunca comprou');
  });

  it('erro ao carregar clientes: mostra o erro e não trava em loading pra sempre', async () => {
    usersService.getComEstatisticas.mockRejectedValue(new Error('Falha ao carregar clientes.'));
    renderSection();

    expect(await screen.findByText('Falha ao carregar clientes.')).toBeInTheDocument();
    expect(await screen.findByText('Nenhum cliente cadastrado ainda.')).toBeInTheDocument();
  });

  it('busca por nome ou e-mail', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Ana Souza');

    await user.type(screen.getByPlaceholderText(/buscar por nome ou e-mail/i), 'bruno@');

    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  it('ordena por gastos ao clicar em "Gastos"', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /gastos/i }));

    const nomes = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(nomes).toEqual(['Ana Souza', 'Bruno Lima']); // Ana gastou mais (420.50 > 90)
  });
});
