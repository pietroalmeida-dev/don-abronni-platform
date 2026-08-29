import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrdersSection from './OrdersSection';
import Toast from '../../common/Toast';
import { ToastProvider } from '../../../contexts/ToastContext';
import { ordersService } from '../../../services/ordersService';

// Mesmo padrão de CheckoutModal.test.jsx: mocka a fronteira de rede (ordersService)
// pra isolar só a lógica da seção — filtros, busca, e os dois pontos que corrigi
// nesta revisão (updateStatus e createManualAdmin não checavam falha).
vi.mock('../../../services/ordersService', () => ({
  ordersService: { getAll: vi.fn(), updateStatus: vi.fn(), createManualAdmin: vi.fn() },
}));

const pedidoRecebido = {
  id: 'DA-20260810-001',
  clienteNome: 'Ana Souza',
  itens: [{ quantidade: 2, nome: 'Pizza Margherita' }],
  total: 75.98,
  status: 'recebido',
  criadoEm: '2026-08-10T18:00:00.000Z',
};
const pedidoEntregue = {
  id: 'DA-20260809-002',
  clienteNome: 'Bruno Lima',
  itens: [{ quantidade: 1, nome: 'Pizza Calabresa' }],
  total: 42.9,
  status: 'entregue',
  criadoEm: '2026-08-09T12:00:00.000Z',
};

function renderSection(onOrdersChanged = vi.fn()) {
  render(
    <ToastProvider>
      <Toast />
      <OrdersSection onOrdersChanged={onOrdersChanged} />
    </ToastProvider>
  );
  return { onOrdersChanged };
}

describe('OrdersSection (painel admin — pedidos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordersService.getAll.mockResolvedValue([pedidoRecebido, pedidoEntregue]);
  });

  it('mostra o spinner de carregamento e depois os pedidos com a contagem certa por status', async () => {
    renderSection();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    // Card "Todos" mostra o total geral; o card de "Recebido" mostra só os com esse
    // status. Escopado a .orders-header-stats porque "Recebido" também aparece no
    // badge do próprio card do pedido, mais abaixo na página.
    const stats = screen.getByText('Todos').closest('.orders-header-stats');
    expect(within(stats).getByText('Todos').closest('.order-status-card')).toHaveTextContent('2');
    expect(within(stats).getByText('Recebido').closest('.order-status-card')).toHaveTextContent('1');
  });

  it('filtra por status ao clicar num card de contagem', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Ana Souza');

    await user.click(within(screen.getByText('Todos').closest('.orders-header-stats')).getByText('Entregue').closest('.order-status-card'));

    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  it('busca por nome do cliente ou número da nota', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Ana Souza');

    await user.type(screen.getByPlaceholderText(/buscar por cliente/i), 'DA-20260809');

    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
  });

  // 🔒 Antes desta revisão, salvarNovoStatus() nunca checava o retorno de
  // ordersService.updateStatus (que devolve { ok: false, erro } em vez de lançar
  // exceção) — uma falha real fechava o modal e mostrava "atualizado" mesmo sem
  // nada ter mudado no banco. Este teste cobre o caminho de sucesso...
  it('atualizar status com sucesso: chama updateStatus, recarrega a lista e avisa', async () => {
    ordersService.updateStatus.mockResolvedValue({ ok: true, pedido: { ...pedidoRecebido, status: 'preparando' } });
    const user = userEvent.setup();
    const { onOrdersChanged } = renderSection();
    await screen.findByText('Ana Souza');

    await user.click(within(screen.getByText('Ana Souza').closest('.order-card')).getByRole('button', { name: /atualizar/i }));
    const modal = screen.getByText('Atualizar status do pedido').closest('.modal-dash');
    await user.selectOptions(within(modal).getByLabelText('Novo status'), 'preparando');
    await user.click(within(modal).getByRole('button', { name: /salvar/i }));

    expect(ordersService.updateStatus).toHaveBeenCalledWith('DA-20260810-001', 'preparando');
    expect(await screen.findByText(/atualizado/i)).toBeInTheDocument();
    expect(ordersService.getAll).toHaveBeenCalledTimes(2); // carga inicial + recarga após salvar
    expect(onOrdersChanged).toHaveBeenCalledOnce();
    // DashboardModal nunca desmonta o título (só alterna a classe "active" via
    // CSS) — fechar de verdade significa perder essa classe, não sumir do DOM.
    expect(screen.getByText('Atualizar status do pedido').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  // ...e este cobre o caminho de falha que ficava silencioso (falso positivo).
  it('atualizar status com falha do backend: mostra o erro, mantém o modal aberto e NÃO chama onOrdersChanged', async () => {
    ordersService.updateStatus.mockResolvedValue({ ok: false, erro: 'Sessão de admin expirada.' });
    const user = userEvent.setup();
    const { onOrdersChanged } = renderSection();
    await screen.findByText('Ana Souza');

    await user.click(within(screen.getByText('Ana Souza').closest('.order-card')).getByRole('button', { name: /atualizar/i }));
    await user.click(within(screen.getByText('Atualizar status do pedido').closest('.modal-dash')).getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Sessão de admin expirada.')).toBeInTheDocument();
    expect(screen.getByText('Atualizar status do pedido').closest('.modal-overlay-dash')).toHaveClass('active'); // continua aberto
    expect(ordersService.getAll).toHaveBeenCalledOnce(); // não recarregou
    expect(onOrdersChanged).not.toHaveBeenCalled();
  });

  it('novo pedido manual: valida campos obrigatórios antes de chamar o service', async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /novo pedido/i }));
    await user.click(within(screen.getByText('Criar novo pedido (telefone/balcão)').closest('.modal-dash')).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Preencha todos os campos.')).toBeInTheDocument();
    expect(ordersService.createManualAdmin).not.toHaveBeenCalled();
  });

  it('novo pedido manual: sucesso fecha o modal, recarrega a lista e avisa', async () => {
    ordersService.createManualAdmin.mockResolvedValue({ ...pedidoRecebido, id: 'DA-20260810-003' });
    const user = userEvent.setup();
    const { onOrdersChanged } = renderSection();
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /novo pedido/i }));
    const modal = screen.getByText('Criar novo pedido (telefone/balcão)').closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Cliente'), 'Carla Nunes');
    await user.type(within(modal).getByLabelText('Itens'), 'Margherita, Pepperoni');
    await user.type(within(modal).getByLabelText('Total'), '89.90');
    await user.click(within(modal).getByRole('button', { name: /adicionar/i }));

    expect(ordersService.createManualAdmin).toHaveBeenCalledOnce();
    expect(await screen.findByText('Pedido adicionado.')).toBeInTheDocument();
    expect(ordersService.getAll).toHaveBeenCalledTimes(2);
    expect(onOrdersChanged).toHaveBeenCalledOnce();
    expect(screen.getByText('Criar novo pedido (telefone/balcão)').closest('.modal-overlay-dash')).not.toHaveClass('active');
  });

  // 🔒 createManualAdmin (diferente de create/updateStatus) não captura erro
  // internamente — lança exceção. Sem o try/catch que adicionei, uma falha aqui
  // não mostrava nada: o admin ficava olhando o modal aberto sem saber se o
  // pedido foi lançado ou não.
  it('novo pedido manual: falha do backend mostra o erro e mantém o modal aberto', async () => {
    ordersService.createManualAdmin.mockRejectedValue(new Error('Não foi possível conectar ao servidor.'));
    const user = userEvent.setup();
    const { onOrdersChanged } = renderSection();
    await screen.findByText('Ana Souza');

    await user.click(screen.getByRole('button', { name: /novo pedido/i }));
    const modal = screen.getByText('Criar novo pedido (telefone/balcão)').closest('.modal-dash');
    await user.type(within(modal).getByLabelText('Cliente'), 'Carla Nunes');
    await user.type(within(modal).getByLabelText('Itens'), 'Margherita');
    await user.type(within(modal).getByLabelText('Total'), '50');
    await user.click(within(modal).getByRole('button', { name: /adicionar/i }));

    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument();
    expect(screen.getByText('Criar novo pedido (telefone/balcão)').closest('.modal-overlay-dash')).toHaveClass('active');
    expect(onOrdersChanged).not.toHaveBeenCalled();
  });
});
